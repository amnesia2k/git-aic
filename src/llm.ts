import axios from "axios";
import chalk from "chalk";
import {
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

const API_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

const getApiKey = () => process.env.GEMINI_COMMIT_MESSAGE_API_KEY || "";

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

const requestText = async (prompt: string, fallback: string) => {
  const API_KEY = ensureApiKey();

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
    console.error("LLM request failed:", error);
    return fallback;
  }
};

export const generateCommitMessage = async (
  rawDiff: string,
  branchName: string,
): Promise<string> => {
  const prompt = buildPrompt(rawDiff, branchName);

  return requestText(prompt, "chore: update code");
};

export const generateDiffExplanation = async (
  filePath: string,
  rawDiff: string,
  branchName: string,
): Promise<string> => {
  const prompt = buildDiffExplanationPrompt(filePath, rawDiff, branchName);

  return requestText(
    prompt,
    `Updates ${filePath} with the staged changes shown below.`,
  );
};

export const generateDiffFileName = async (
  rawDiff: string,
  branchName: string,
): Promise<string> => {
  const prompt = buildDiffFileNamePrompt(rawDiff, branchName);
  const rawName = await requestText(prompt, `proposed-${branchName || "diff"}`);

  return rawName
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "proposed-diff";
};
