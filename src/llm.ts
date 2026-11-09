import axios from "axios";
import type { AxiosError } from "axios";
import { resolveApiKey, resolveModel } from "./config.js";
import {
  COMMIT_TYPES,
  buildBatchDiffExplanationsPrompt,
  buildDiffFileNamePrompt,
  buildPrompt,
  normalizeBranchNameForCommitMessage,
} from "./prompt.js";
import { prepareDiffForPrompt, prepareFileDiffForPrompt } from "./diff.js";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

interface GeminiErrorBody {
  error?: {
    message?: string;
    status?: string;
    details?: Array<{ "@type"?: string; retryDelay?: string }>;
  };
}

type Operation = "commit-message" | "diff-filename" | "diff-explanations";

export interface RequestOptions {
  /** Receives retry/fallback notices so the caller can show them without garbling a spinner. */
  onNotice?: (message: string) => void;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("No Gemini API key configured.");
    this.name = "MissingApiKeyError";
  }
}

export class GeminiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | string,
    /** Retrying will not help (bad key, bad request, permission, unknown model...). */
    public readonly fatal: boolean,
  ) {
    super(message);
    this.name = "GeminiRequestError";
  }
}

const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_RETRY_DELAY_MS = 30_000;
const RETRYABLE_NETWORK_CODES = [
  "ECONNABORTED",
  "ETIMEDOUT",
  "ECONNRESET",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "EPIPE",
];

const getApiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolveModel().value)}:generateContent`;

const getApiKey = () => {
  const { value } = resolveApiKey();

  if (!value) {
    throw new MissingApiKeyError();
  }

  return value;
};


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const OPERATION_LABELS: Record<Operation, string> = {
  "commit-message": "generating the commit message",
  "diff-filename": "generating the report filename",
  "diff-explanations": "explaining the diffs",
};

const isRetryableError = (error: AxiosError) => {
  const status = error.response?.status;

  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  return !error.response && RETRYABLE_NETWORK_CODES.includes(error.code || "");
};

const getRetryDelay = (error: AxiosError<GeminiErrorBody>, attempt: number) => {
  const retryAfterHeader: unknown = error.response?.headers?.["retry-after"];
  const retryAfterSeconds = Number(retryAfterHeader);

  if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
  }

  const retryDelay = error.response?.data?.error?.details?.find(
    (detail) => detail.retryDelay,
  )?.retryDelay;
  const retryDelaySeconds = retryDelay ? parseFloat(retryDelay) : NaN;

  if (!Number.isNaN(retryDelaySeconds) && retryDelaySeconds > 0) {
    return Math.min(retryDelaySeconds * 1000, MAX_RETRY_DELAY_MS);
  }

  return Math.min(1000 * 2 ** (attempt - 1), 8000);
};

const describeAxiosError = (error: AxiosError<GeminiErrorBody>) => {
  const status = error.response?.status;
  const apiMessage = error.response?.data?.error?.message;

  if (status === 400 && /api key/i.test(apiMessage || "")) {
    return "the Gemini API key is invalid";
  }

  if (status === 401 || status === 403) {
    return `the Gemini API key was rejected (${apiMessage || `HTTP ${status}`})`;
  }

  if (status === 404) {
    return `model "${resolveModel().value}" was not found (${apiMessage || "HTTP 404"}). Check your model setting with "git-aic show"`;
  }

  if (status) {
    return apiMessage ? `${apiMessage} (HTTP ${status})` : `HTTP ${status}`;
  }

  return error.code === "ECONNABORTED"
    ? `request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
    : error.message || error.code || "network error";
};

const extractText = (data: GeminiResponse, operation: Operation) => {
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();

  if (text) {
    return text;
  }

  const reason =
    data.promptFeedback?.blockReason ||
    candidate?.finishReason ||
    "empty response";

  throw new GeminiRequestError(
    `Gemini returned no text while ${OPERATION_LABELS[operation]} (${reason}).`,
    reason,
    false,
  );
};

const requestText = async (
  prompt: string,
  operation: Operation,
  options: RequestOptions = {},
): Promise<string> => {
  const apiKey = getApiKey();
  const notify = options.onNotice || ((message: string) => console.log(message));

  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await axios.post<GeminiResponse>(
        getApiUrl(),
        { contents: [{ parts: [{ text: prompt }] }] },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      );

      return extractText(response.data, operation);
    } catch (error) {
      if (!axios.isAxiosError<GeminiErrorBody>(error)) {
        throw error;
      }

      const status = error.response?.status || error.code || "network-error";

      if (isRetryableError(error) && attempt < MAX_ATTEMPTS) {
        const delay = getRetryDelay(error, attempt);
        notify(
          `Gemini ${status} while ${OPERATION_LABELS[operation]}; retry ${attempt}/${MAX_ATTEMPTS - 1} in ${Math.ceil(delay / 1000)}s...`,
        );
        await sleep(delay);
        continue;
      }

      throw new GeminiRequestError(
        `Gemini request failed while ${OPERATION_LABELS[operation]}: ${describeAxiosError(error)}.`,
        status,
        !isRetryableError(error),
      );
    }
  }
};

/* -------------------------------------------------------------------------- */
/*                              Commit messages                               */
/* -------------------------------------------------------------------------- */

const SUMMARY_PATTERN = new RegExp(
  `^(${COMMIT_TYPES.join("|")})(\\([^()\\s][^()]*\\))?!?: \\S.*$`,
);
export const MAX_SUMMARY_LENGTH = 72;

/** Strips the wrapping models tend to add (fences, quotes, labels) and normalizes the scope's branch. */
export const sanitizeCommitMessage = (raw: string) => {
  let text = raw.trim();

  text = text
    .split(/\r?\n/)
    .filter((line) => !/^\s*```/.test(line))
    .join("\n")
    .trim();
  text = text.replace(/^commit message\s*:\s*/i, "").trim();

  const wrappers = ['"', "'", "`"];
  while (
    text.length >= 2 &&
    wrappers.includes(text[0]) &&
    text[text.length - 1] === text[0]
  ) {
    text = text.slice(1, -1).trim();
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n");

  lines[0] = (lines[0] || "")
    .trim()
    .replace(/[.!;,]+$/, "")
    .replace(
      /^([a-z]+)\(([^()/]+)\/([^)]+)\)(!?):(.*)$/i,
      (_, type: string, scope: string, branch: string, bang: string, rest: string) => {
        const normalized = normalizeBranchNameForCommitMessage(branch);
        return `${type}(${normalized ? `${scope}/${normalized}` : scope})${bang}:${rest}`;
      },
    );

  return lines.join("\n").trim();
};

export interface CommitMessageCheck {
  valid: boolean;
  problems: string[];
}

export const checkCommitMessage = (message: string): CommitMessageCheck => {
  const summary = message.split("\n")[0] || "";
  const problems: string[] = [];
  let valid = true;

  if (!SUMMARY_PATTERN.test(summary)) {
    valid = false;
    problems.push(
      `summary is not in Conventional Commits format ("<type>(<scope>): <description>", type one of ${COMMIT_TYPES.join(", ")})`,
    );
  }

  if (summary.length > MAX_SUMMARY_LENGTH) {
    problems.push(
      `summary is ${summary.length} characters (recommended maximum is ${MAX_SUMMARY_LENGTH})`,
    );
  }

  return { valid, problems };
};

export const generateCommitMessage = async (
  rawDiff: string,
  branchName: string,
  options: RequestOptions = {},
): Promise<string> => {
  const prompt = buildPrompt(prepareDiffForPrompt(rawDiff), branchName);
  const message = sanitizeCommitMessage(
    await requestText(prompt, "commit-message", options),
  );

  if (checkCommitMessage(message).valid) {
    return message;
  }

  // One corrective attempt when the model ignores the format.
  const retried = sanitizeCommitMessage(
    await requestText(
      `${prompt}\n\nYour previous answer was not valid:\n${message}\n\nReturn ONLY a valid commit message in the required format.`,
      "commit-message",
      options,
    ),
  );

  return checkCommitMessage(retried).valid ? retried : message;
};

/* -------------------------------------------------------------------------- */
/*                                Diff reports                                */
/* -------------------------------------------------------------------------- */

interface DiffFileInput {
  filePath: string;
  diff: string;
}

export const getFallbackExplanation = (filePath: string) =>
  `Updates ${filePath} with the changes shown below.`;

const parseBatchDiffExplanations = (value: string, filePaths: string[]) => {
  const result = new Map<string, string>();
  const blockRegex =
    /^[*\s]*FILE:[*\s]*(.+?)[*\s]*\r?\n[*\s]*EXPLANATION:[*\s]*([\s\S]*?)\r?\n[*\s]*END_FILE/gm;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(value)) !== null) {
    const filePath = match[1].trim().replace(/^`|`$/g, "");
    const explanation = match[2].trim();

    if (filePaths.includes(filePath) && explanation.length > 0) {
      result.set(filePath, explanation);
    }
  }

  return result;
};

/**
 * Explains each file. Transient failures fall back to placeholder text (with a
 * notice); configuration errors such as a bad key are thrown.
 */
export const generateDiffExplanations = async (
  fileDiffs: DiffFileInput[],
  branchName: string,
  options: RequestOptions = {},
): Promise<Map<string, string>> => {
  const notify = options.onNotice || ((message: string) => console.log(message));
  const prompt = buildBatchDiffExplanationsPrompt(
    fileDiffs.map(({ filePath, diff }) => ({
      filePath,
      diff: prepareFileDiffForPrompt(filePath, diff),
    })),
    branchName,
  );
  let explanations = new Map<string, string>();

  try {
    const response = await requestText(prompt, "diff-explanations", options);
    explanations = parseBatchDiffExplanations(
      response,
      fileDiffs.map(({ filePath }) => filePath),
    );

    if (explanations.size < fileDiffs.length) {
      notify(
        `Gemini explained ${explanations.size}/${fileDiffs.length} files; using placeholder text for the rest.`,
      );
    }
  } catch (error) {
    if (error instanceof GeminiRequestError && !error.fatal) {
      notify(`${error.message} Using placeholder explanations.`);
    } else {
      throw error;
    }
  }

  fileDiffs.forEach(({ filePath }) => {
    if (!explanations.has(filePath)) {
      explanations.set(filePath, getFallbackExplanation(filePath));
    }
  });

  return explanations;
};

const VALID_DIFF_FILE_TYPES = new Set<string>(COMMIT_TYPES);

const sanitizeTopic = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .join("-");

const parseDiffFileName = (value: string) => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.replace(/[*`"]/g, "").trim())
    .filter(Boolean);

  const rawType =
    lines
      .find((line) => /^type\s*:/i.test(line))
      ?.replace(/^type\s*:/i, "")
      .trim()
      .toLowerCase() || "";
  const rawTopic =
    lines.find((line) => /^topic\s*:/i.test(line))?.replace(/^topic\s*:/i, "") ||
    "";

  const type = VALID_DIFF_FILE_TYPES.has(rawType) ? rawType : "chore";
  const topic = sanitizeTopic(rawTopic) || "changes";

  return `${type}-${topic}`;
};

export const generateDiffFileName = async (
  rawDiff: string,
  options: RequestOptions = {},
): Promise<string> => {
  const notify = options.onNotice || ((message: string) => console.log(message));

  try {
    const rawName = await requestText(
      buildDiffFileNamePrompt(prepareDiffForPrompt(rawDiff, 40_000)),
      "diff-filename",
      options,
    );
    return parseDiffFileName(rawName);
  } catch (error) {
    if (error instanceof GeminiRequestError && !error.fatal) {
      notify(`${error.message} Using a fallback filename.`);
      return "chore-changes";
    }

    throw error;
  }
};
