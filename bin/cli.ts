#!/usr/bin/env ts-node

import { Command } from "commander";
import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";
import chalk from "chalk";
import { getGitDiff, getBranchName } from "../src/git.js";
import { generateCommitMessage } from "../src/llm.js";
import { spawnSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

const git: SimpleGit = simpleGit();
const program = new Command();

const normalizeLegacyDiffFlag = () => {
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === "-diff") {
      process.argv[index] = "--diff";
    }
  }
};

const sanitizeFileSegment = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const getAvailableMarkdownPath = (baseName: string) => {
  const cleanBaseName = sanitizeFileSegment(baseName) || "proposed-diff";
  const cwd = process.cwd();
  let candidate = join(cwd, `${cleanBaseName}.md`);
  let counter = 1;

  while (existsSync(candidate)) {
    candidate = join(cwd, `${cleanBaseName}-${counter}.md`);
    counter += 1;
  }

  return candidate;
};

const createDiffMarkdown = (
  diff: string,
  branchName: string,
  stagedFiles: string[],
) => {
  const lines = [
    "# Proposed Diff",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Branch: ${branchName || "unknown"}`,
    "",
    "## Staged Files",
    "",
    ...(stagedFiles.length > 0
      ? stagedFiles.map((file) => `- ${file}`)
      : ["- No staged files detected"]),
    "",
    "## Diff",
    "",
    "```diff",
    diff.trimEnd(),
    "```",
    "",
  ];

  return lines.join("\n");
};

program
  .name("commit")
  .description("AI-powered Git commit using Google Gemini")
  .version("1.0.0")
  .option("-p, --push", "push after committing")
  .option("-d, --diff", "write the staged diff to a markdown file");

program.action(async (options) => {
  try {
    const diff = await getGitDiff();

    if (!diff) {
      console.log(chalk.yellow("No staged changes found."));
      console.log(chalk.cyan("Fetching unstaged changes..."));

      const status = await git.status();

      // Automatically stage deleted files
      if (status.deleted.length > 0) {
        console.log(
          chalk.cyan(
            `Auto-staging ${status.deleted.length} deleted file(s)...`,
          ),
        );
        await git.add(status.deleted);
      }

      const uncommittedFiles = [
        ...status.modified,
        ...status.not_added,
        ...status.created,
      ];

      // Remove duplicates
      const uniqueFiles = Array.from(new Set(uncommittedFiles));

      if (uniqueFiles.length === 0) {
        // If there were only deleted files, we might be good to go now!
        const postStageDiff = await getGitDiff();
        if (postStageDiff) {
          console.log(chalk.green("Auto-staged deleted files successfully."));
        } else {
          console.log(chalk.yellow("No files changed in this repository."));
          process.exit(0);
        }
      } else if (uniqueFiles.length === 1) {
        console.log(
          chalk.cyan(`\nOnly one unstaged file found: ${uniqueFiles[0]}`),
        );
        console.log(chalk.blue(`Staging 1 file(s)...`));
        await git.add(uniqueFiles[0]);
      } else {
        console.log();
        const p = await import("@clack/prompts");

        p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));

        const selectedFiles = await p.multiselect({
          message:
            "Select the files you want to stage and commit (space to select files, a to select all, enter to continue, arrows to scroll):",
          options: uniqueFiles.map((file) => ({ value: file, label: file })),
          required: false,
        });

        if (
          p.isCancel(selectedFiles) ||
          !selectedFiles ||
          (selectedFiles as string[]).length === 0
        ) {
          // Check if deleted files were staged
          const postStageDiff = await getGitDiff();
          if (!postStageDiff) {
            p.outro(chalk.yellow("No files selected. Exiting."));
            process.exit(0);
          }
        } else {
          const filesToStage = selectedFiles as string[];
          p.outro(chalk.blue(`Staging ${filesToStage.length} file(s)...`));
          await git.add(filesToStage);
        }
      }
    }

    // Re-check diff after potential staging
    const finalDiff = await getGitDiff();
    if (!finalDiff) {
      console.log(chalk.yellow("Still no changes to commit!"));
      process.exit(0);
    }

    const status = await git.status();
    console.log(chalk.blue("\nFiles being committed:"));
    status.staged.forEach((file) => console.log(chalk.cyan(`- ${file}`)));
    console.log("");

    if (options.diff) {
      const branchName = await getBranchName();
      const defaultFileName = branchName
        ? `proposed-${sanitizeFileSegment(branchName)}`
        : "proposed-diff";
      const markdownPath = getAvailableMarkdownPath(defaultFileName);
      const markdown = createDiffMarkdown(finalDiff, branchName, status.staged);

      writeFileSync(markdownPath, markdown, "utf8");
      console.log(chalk.green(`Diff markdown written to ${markdownPath}`));
      process.exit(0);
    }

    console.log(chalk.blue("Analyzing staged changes...\n"));
    const branchName = await getBranchName();
    const message = await generateCommitMessage(finalDiff, branchName);

    console.log(chalk.green("Commit message generated:\n"));
    console.log(chalk.green(`"${message}"\n`));

    console.log(chalk.blue(`> ran: git commit -m\n"${message}"`));
    // await git.commit(message);

    const commitResult = spawnSync("git", ["commit", "-F", "-"], {
      input: message,
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (commitResult.status !== 0) {
      throw new Error(`Git commit failed with status ${commitResult.status}`);
    }

    console.log(chalk.green("\nCommit successful"));

    if (options.push) {
      console.log(chalk.blue("\n> ran: git push"));
      const pushResult = spawnSync("git", ["push"], { stdio: "inherit" });

      if (pushResult.status !== 0) {
        throw new Error(`Git push failed with status ${pushResult.status}`);
      }

      console.log(chalk.green("Push successful"));
    }
  } catch (error: any) {
    if (
      error.name === "ExitPromptError" ||
      error.message?.includes("force closed") ||
      error.message?.includes("Prompt was canceled")
    ) {
      console.log(chalk.yellow("\nCommit cancelled."));
      process.exit(0);
    }
    console.error(chalk.red("Commit failed:"), error);
    process.exit(1);
  }
});

normalizeLegacyDiffFlag();
program.parse(process.argv);
