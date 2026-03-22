import axios from "axios";
import type { AxiosError } from "axios";
import chalk from "chalk";
import { getStoredApiKey } from "./config.js";
import {
  buildBatchDiffExplanationsPrompt,
  buildDiffExplanationPrompt,
  buildDiffFileNamePrompt,
  buildPrompt,
} from "./prompt.js";

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  parts?: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
}

interface RequestContext {
  operation: "commit-message" | "diff-filename" | "diff-explanations";
  target?: string;
}

interface DiffFileInput {
  filePath: string;
  diff: string;
}

const VALID_DIFF_FILE_TYPES = new Set([
  "feat",
  "fix",
  "refactor",
  "chore",
  "docs",
  "style",
  "test",
  "perf",
  "bugfix",
]);

const API_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";
const MAX_RETRIES = 4;

const getApiKey = () =>
  process.env.GEMINI_COMMIT_MESSAGE_API_KEY || getStoredApiKey() || "";

const ensureApiKey = () => {
  const API_KEY = getApiKey();

  if (!API_KEY) {
    console.error(
      chalk.red(
        "\nMissing GEMINI_COMMIT_MESSAGE_API_KEY environment variable.\n",
      ),
    );

    console.log("Please set your API key before running this command.\n");

    console.log(chalk.yellow("How to fix this:\n"));

    console.log(chalk.cyan("macOS / Linux:"));
    console.log("  export GEMINI_COMMIT_MESSAGE_API_KEY=your_api_key_here\n");

    console.log(chalk.cyan("Windows (PowerShell):"));
    console.log('  setx GEMINI_COMMIT_MESSAGE_API_KEY "your_api_key_here"\n');

    console.log(
      chalk.gray("After setting the variable, restart your terminal.\n"),
    );

    process.exit(1);
  }

  return API_KEY;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getOperationLabel = ({ operation, target }: RequestContext) => {
  if (operation === "diff-filename") {
    return "generating diff filename";
  }

  if (operation === "diff-explanations") {
    return target
      ? `generating diff explanations for ${target}`
      : "generating diff explanations";
  }

  return "generating commit message";
};

const getFallbackLabel = ({ operation, target }: RequestContext) => {
  if (operation === "diff-filename") {
    return "using fallback filename";
  }

  if (operation === "diff-explanations") {
    return target
      ? `using fallback explanations for ${target}`
      : "using fallback explanations";
  }

  return "using fallback commit message";
};

const isRetryableError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  if (status === 429) {
    return true;
  }

  if (status && status >= 500) {
    return true;
  }

  return [
    "ECONNABORTED",
    "ETIMEDOUT",
    "ECONNRESET",
    "ENOTFOUND",
    "EAI_AGAIN",
  ].includes(error.code || "");
};

const getRetryDelay = (error: AxiosError, attempt: number) => {
  const retryAfterHeader = error.response?.headers?.["retry-after"];

  if (typeof retryAfterHeader === "string") {
    const retryAfterSeconds = Number(retryAfterHeader);

    if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }
  }

  return Math.min(750 * 2 ** (attempt - 1), 3000);
};

const requestText = async (
  prompt: string,
  fallback: string,
  context: RequestContext,
) => {
  const API_KEY = ensureApiKey();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await axios.post<GeminiResponse>(
        API_URL,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY,
          },
        },
      );

      return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        ? response.data.candidates[0].content!.parts![0].text!.trim()
        : fallback;
    } catch (error) {
      if (axios.isAxiosError(error) && isRetryableError(error)) {
        if (attempt < MAX_RETRIES) {
          const delay = getRetryDelay(error, attempt);
          const status = error.response?.status || error.code || "unknown";
          console.log(
            chalk.yellow(
              `Gemini request retry ${attempt}/${MAX_RETRIES - 1} while ${getOperationLabel(context)} (${status}). Waiting ${Math.ceil(delay / 1000)}s...`,
            ),
          );
          await sleep(delay);
          continue;
        }
      }

      const status = axios.isAxiosError(error)
        ? error.response?.status || error.code || "request-error"
        : "request-error";
      console.log(
        chalk.yellow(
          `Gemini request failed while ${getOperationLabel(context)} (${status}); ${getFallbackLabel(context)}.`,
        ),
      );
      return fallback;
    }
  }

  return fallback;
};

const sanitizeTopic = (value: string) => {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const tokens = sanitized.split("-").filter(Boolean).slice(0, 3);

  return tokens.join("-");
};

const parseDiffFileName = (value: string) => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const typeLine = lines.find((line) => /^type\s*:/i.test(line));
  const topicLine = lines.find((line) => /^topic\s*:/i.test(line));

  const rawType =
    typeLine
      ?.replace(/^type\s*:/i, "")
      .trim()
      .toLowerCase() || "";
  const rawTopic = topicLine?.replace(/^topic\s*:/i, "").trim() || "";

  const type = VALID_DIFF_FILE_TYPES.has(rawType) ? rawType : "chore";
  const topic = sanitizeTopic(rawTopic) || "changes";

  return `${type}-${topic}`;
};

export const generateCommitMessage = async (
  rawDiff: string,
  branchName: string,
): Promise<string> => {
  const prompt = buildPrompt(rawDiff, branchName);

  return requestText(prompt, "chore: update code", {
    operation: "commit-message",
  });
};

export const generateDiffExplanation = async (
  filePath: string,
  rawDiff: string,
  branchName: string,
): Promise<string> => {
  const prompt = buildDiffExplanationPrompt(filePath, rawDiff, branchName);

  return requestText(
    prompt,
    `Updates ${filePath} with the selected changes shown below.`,
    {
      operation: "diff-explanations",
      target: filePath,
    },
  );
};

const parseBatchDiffExplanations = (value: string, filePaths: string[]) => {
  const result = new Map<string, string>();
  const blockRegex =
    /FILE:\s*(.+?)\r?\nEXPLANATION:\s*([\s\S]*?)\r?\nEND_FILE/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(value)) !== null) {
    const filePath = match[1].trim();
    const explanation = match[2].trim();

    if (filePaths.includes(filePath) && explanation.length > 0) {
      result.set(filePath, explanation);
    }
  }

  return result;
};

export const generateDiffExplanations = async (
  fileDiffs: DiffFileInput[],
  branchName: string,
): Promise<Map<string, string>> => {
  const prompt = buildBatchDiffExplanationsPrompt(fileDiffs, branchName);
  const response = await requestText(prompt, "", {
    operation: "diff-explanations",
    target: `${fileDiffs.length} files`,
  });

  const explanations = parseBatchDiffExplanations(
    response,
    fileDiffs.map(({ filePath }) => filePath),
  );

  if (explanations.size === fileDiffs.length) {
    return explanations;
  }

  if (response.trim().length > 0) {
    console.log(
      chalk.yellow(
        "Gemini returned incomplete diff explanations; using fallback text for missing files.",
      ),
    );
  }

  fileDiffs.forEach(({ filePath }) => {
    if (!explanations.has(filePath)) {
      explanations.set(
        filePath,
        `Updates ${filePath} with the selected changes shown below.`,
      );
    }
  });

  return explanations;
};

export const generateDiffFileName = async (
  rawDiff: string,
): Promise<string> => {
  const prompt = buildDiffFileNamePrompt(rawDiff);
  const rawName = await requestText(prompt, "type: chore\ntopic: changes", {
    operation: "diff-filename",
  });

  return parseDiffFileName(rawName);
};
