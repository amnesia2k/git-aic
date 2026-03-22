#!/usr/bin/env ts-node

import { Command } from "commander";
import { arrows_3 } from "cli-loaders";
import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";
import chalk from "chalk";
import {
  getGitDiff,
  getBranchName,
  getHeadCommitInfo,
  getSelectedFileDiffs,
  getSelectedFilesDiff,
  type HeadCommitInfo,
  type FileDiff,
} from "../src/git.js";
import {
  generateCommitMessage,
  generateDiffExplanations,
  generateDiffFileName,
} from "../src/llm.js";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const git: SimpleGit = simpleGit();
const program = new Command();

const createLoader = () => {
  let timer: NodeJS.Timeout | null = null;
  let frameIndex = 0;
  let message = "";

  const render = () => {
    if (!process.stdout.isTTY) {
      return;
    }

    const frame = arrows_3.keyframes[frameIndex % arrows_3.keyframes.length];
    frameIndex += 1;
    process.stdout.write(`\r${chalk.cyan(frame)} ${message}`);
  };

  const clear = () => {
    if (!process.stdout.isTTY) {
      return;
    }

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  };

  return {
    start(nextMessage: string) {
      message = nextMessage;
      frameIndex = 0;
      render();

      if (timer) {
        clearInterval(timer);
      }

      timer = setInterval(render, arrows_3.speed);
    },
    update(nextMessage: string) {
      message = nextMessage;
      render();
    },
    succeed(doneMessage: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      clear();
      console.log(chalk.green(`OK ${doneMessage}`));
    },
    fail(errorMessage: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      clear();
      console.log(chalk.red(`ERROR ${errorMessage}`));
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      clear();
    },
  };
};

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

const getChangedFiles = (status: Awaited<ReturnType<SimpleGit["status"]>>) =>
  Array.from(
    new Set([
      ...status.staged,
      ...status.modified,
      ...status.not_added,
      ...status.created,
      ...status.deleted,
    ]),
  );

const unstageFiles = async (files: string[]) => {
  if (files.length === 0) {
    return;
  }

  const restoreResult = spawnSync(
    "git",
    ["restore", "--staged", "--", ...files],
    { stdio: "ignore" },
  );

  if (restoreResult.status === 0) {
    return;
  }

  const resetResult = spawnSync("git", ["reset", "HEAD", "--", ...files], {
    stdio: "ignore",
  });

  if (resetResult.status !== 0) {
    throw new Error("Failed to update staged file selection");
  }
};

const selectFilesForOperation = async (
  actionLabel: string,
  status: Awaited<ReturnType<SimpleGit["status"]>>,
  shouldStageSelection: boolean,
) => {
  const changedFiles = getChangedFiles(status);

  if (changedFiles.length === 0) {
    return;
  }

  if (changedFiles.length === 1) {
    const onlyFile = changedFiles[0];

    if (shouldStageSelection && !status.staged.includes(onlyFile)) {
      console.log(chalk.cyan(`\nOnly one changed file found: ${onlyFile}`));
      console.log(chalk.blue("Staging 1 file..."));
      await git.add(onlyFile);
    }

    return [onlyFile];
  }

  const p = await import("@clack/prompts");

  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));

  const selectedFiles = await p.multiselect({
    message: `Select the files you want to ${actionLabel}:`,
    options: changedFiles.map((file) => ({
      value: file,
      label: status.staged.includes(file) ? `${file} (staged)` : file,
    })),
    initialValues: status.staged,
    required: false,
  });

  if (
    p.isCancel(selectedFiles) ||
    !selectedFiles ||
    (selectedFiles as string[]).length === 0
  ) {
    p.outro(chalk.yellow("No files selected. Exiting."));
    process.exit(0);
  }

  const filesToUse = selectedFiles as string[];
  if (!shouldStageSelection) {
    p.outro(chalk.blue(`Using ${filesToUse.length} selected file(s)...`));
    return filesToUse;
  }

  const filesToUnstage = status.staged.filter(
    (file) => !filesToUse.includes(file),
  );
  const filesToStage = filesToUse.filter(
    (file) => !status.staged.includes(file),
  );

  if (filesToUnstage.length > 0) {
    await unstageFiles(filesToUnstage);
  }

  if (filesToStage.length > 0) {
    p.outro(chalk.blue(`Staging ${filesToStage.length} file(s)...`));
    await git.add(filesToStage);
  } else {
    p.outro(chalk.blue(`Using ${filesToUse.length} selected file(s)...`));
  }

  return filesToUse;
};

const getAvailableMarkdownPath = (directory: string, baseName: string) => {
  const cleanBaseName = sanitizeFileSegment(baseName) || "proposed-diff";
  let candidate = join(directory, `${cleanBaseName}.md`);
  let counter = 1;

  while (existsSync(candidate)) {
    candidate = join(directory, `${cleanBaseName}-${counter}.md`);
    counter += 1;
  }

  return candidate;
};

const ensureGitDiffsIgnored = () => {
  const gitignorePath = join(process.cwd(), ".gitignore");
  const ignoreEntry = "git-diffs/";

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `${ignoreEntry}\n`, "utf8");
    return;
  }

  const currentContents = readFileSync(gitignorePath, "utf8");
  const normalizedEntries = currentContents
    .split(/\r?\n/)
    .map((line) => line.trim());

  if (
    normalizedEntries.includes(ignoreEntry) ||
    normalizedEntries.includes("/git-diffs/") ||
    normalizedEntries.includes("git-diffs") ||
    normalizedEntries.includes("/git-diffs")
  ) {
    return;
  }

  const separator =
    currentContents.endsWith("\n") || currentContents.length === 0 ? "" : "\n";

  writeFileSync(
    gitignorePath,
    `${currentContents}${separator}${ignoreEntry}\n`,
    "utf8",
  );
};

const createDiffMarkdown = async (
  branchName: string,
  headCommit: HeadCommitInfo,
  fileDiffs: FileDiff[],
  updateStatus: (message: string) => void,
) => {
  updateStatus(`Explaining diffs with AI (${fileDiffs.length} files)`);
  const explanations = await generateDiffExplanations(fileDiffs, branchName);
  const sections: string[] = [];

  for (let index = 0; index < fileDiffs.length; index += 1) {
    const { filePath, diff } = fileDiffs[index];
    updateStatus(`Formatting diff ${index + 1}/${fileDiffs.length}: ${filePath}`);
    const explanation =
      explanations.get(filePath) ||
      `Updates ${filePath} with the selected changes shown below.`;

    sections.push(
      [
        `## ${filePath}`,
        "",
        explanation.trim(),
        "",
        "```diff",
        diff.trimEnd(),
        "```",
      ].join("\n"),
    );
  }

  const lines = [
    "# Proposed Diff",
    "",
    "## Metadata",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Branch: ${branchName || "unknown"}`,
    `- Base Commit: ${headCommit.short}`,
    `- Base Commit Full: ${headCommit.full}`,
    "",
    "## Files",
    "",
    ...(fileDiffs.length > 0
      ? fileDiffs.map(({ filePath }) => `- ${filePath}`)
      : ["- No staged files detected"]),
    "",
    ...sections.flatMap((section) => [section, ""]),
  ];

  return lines.join("\n");
};

program
  .name("commit")
  .description("AI-powered Git commit using Google Gemini")
  .version("1.0.0")
  .option("-p, --push", "push after committing")
  .option("-d, --diff", "write selected changes to a markdown diff report");

program.action(async (options) => {
  const loader = createLoader();

  try {
    loader.start("Inspecting repository changes");
    let status = await git.status();

    if (!options.diff && status.deleted.length > 0) {
      loader.update(`Auto-staging ${status.deleted.length} deleted file(s)`);
      await git.add(status.deleted);
      status = await git.status();
    }

    const changedFiles = getChangedFiles(status);

    if (changedFiles.length === 0) {
      loader.stop();
      console.log(chalk.yellow("No files changed in this repository."));
      process.exit(0);
    }

    const actionLabel = options.diff
      ? "include in the diff report"
      : options.push
        ? "commit and push"
        : "commit";
    let selectedFiles: string[] = [];

    if (changedFiles.length > 1) {
      loader.stop();
      selectedFiles =
        (await selectFilesForOperation(actionLabel, status, !options.diff)) || [];
    } else if (!status.staged.includes(changedFiles[0])) {
      loader.stop();
      selectedFiles =
        (await selectFilesForOperation(actionLabel, status, !options.diff)) || [];
    } else {
      selectedFiles = options.diff ? changedFiles : status.staged;
      loader.succeed(
        options.diff
          ? "Using the currently selected file set for diff report"
          : "Using the currently staged file selection",
      );
    }

    loader.start(options.diff ? "Checking selected changes" : "Checking staged changes");
    const finalDiff = options.diff
      ? await getSelectedFilesDiff(selectedFiles)
      : await getGitDiff();

    if (!finalDiff) {
      loader.stop();
      console.log(
        chalk.yellow(
          options.diff
            ? "No selected changes found for the diff report!"
            : "Still no changes to commit!",
        ),
      );
      process.exit(0);
    }

    status = await git.status();
    const filesBeingUsed = options.diff ? selectedFiles : status.staged;
    loader.succeed(
      options.diff
        ? "Collected selected changes for diff report"
        : "Collected staged changes for commit",
    );
    console.log(
      chalk.blue(
        options.diff ? "\nFiles being documented:" : "\nFiles being committed:",
      ),
    );
    filesBeingUsed.forEach((file) => console.log(chalk.cyan(`- ${file}`)));
    console.log("");

    if (options.diff) {
      const branchName = await getBranchName();
      const headCommit = await getHeadCommitInfo();
      loader.start("Collecting selected file diffs");
      const fileDiffs = await getSelectedFileDiffs(selectedFiles);
      const outputDirectory = join(process.cwd(), "git-diffs");
      const outputDirectoryExists = existsSync(outputDirectory);

      loader.update("Preparing git-diffs output folder");
      mkdirSync(outputDirectory, { recursive: true });

      if (!outputDirectoryExists) {
        loader.update("Adding git-diffs to .gitignore");
        ensureGitDiffsIgnored();
      }

      loader.update("Generating AI report filename");
      const aiFileName = await generateDiffFileName(finalDiff);
      const markdownPath = getAvailableMarkdownPath(
        outputDirectory,
        aiFileName,
      );

      const markdown = await createDiffMarkdown(
        branchName,
        headCommit,
        fileDiffs,
        (message) => loader.update(message),
      );

      loader.update("Writing markdown report");
      writeFileSync(markdownPath, markdown, "utf8");
      loader.succeed(`Diff markdown written to ${markdownPath}`);
      process.exit(0);
    }

    loader.start("Analyzing staged changes with AI");
    const branchName = await getBranchName();
    const message = await generateCommitMessage(finalDiff, branchName);
    loader.succeed("Commit message generated");

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
      loader.stop();
      console.log(chalk.yellow("\nCommit cancelled."));
      process.exit(0);
    }
    loader.fail("Command failed");
    console.error(chalk.red("Commit failed:"), error);
    process.exit(1);
  }
});

normalizeLegacyDiffFlag();
program.parse(process.argv);
