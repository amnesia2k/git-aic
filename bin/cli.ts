#!/usr/bin/env node

import { Command } from "commander";
import { arrows_3 } from "cli-loaders";
import chalk from "chalk";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { dirname, join, relative } from "path";
import {
  GitCommandError,
  branchExists,
  countUnpushedCommits,
  createAndSwitchBranch,
  getCommitFileDiff,
  getConfigValue,
  getRemoteDefaultBranch,
  hasCommitIdentity,
  hasHeadCommit,
  isValidBranchName,
  setConfigValue,
  getBranchName,
  getBranchUpstream,
  getChangedFiles,
  getCommitChangeStats,
  getFileLabel,
  getHeadCommitInfo,
  getInfoExcludePath,
  getRepoRoot,
  getStagedDiff,
  getStagedEntries,
  getWorkingChangeStats,
  getWorkingFileDiff,
  hasStagedChanges,
  initRepoRoot,
  isInsideGitRepo,
  isPathIgnored,
  restoreIndex,
  runGit,
  snapshotIndex,
  stageFiles,
  unstageFiles,
  type ChangedFile,
  type FileChangeStats,
  type HeadCommitInfo,
} from "../src/git.js";
import {
  GeminiRequestError,
  MissingApiKeyError,
  checkCommitMessage,
  generateCommitMessage,
  generateDiffExplanations,
  generateDiffFileName,
  getFallbackExplanation,
  type RequestOptions,
} from "../src/llm.js";
import { getMarkdownFence } from "../src/diff.js";
import {
  API_KEY_ENV,
  DEFAULT_MODEL,
  MODEL_ENV,
  clearStoredModel,
  config,
  isBranchPromptEnabled,
  setBranchPromptEnabled,
  isValidModelName,
  resolveApiKey,
  resolveModel,
  setStoredApiKey,
  setStoredModel,
} from "../src/config.js";
import { getPackageVersion } from "../src/version.js";
import {
  UsageError,
  UserAbort,
  isInteractive,
  loadPrompts,
  printIntro,
  requireInteractive,
} from "../src/ui.js";
import { pushCurrentBranch } from "../src/push.js";
import {
  confirmSecretRisks,
  findSecretRisks,
  isExcludedByPrefix,
  suggestGitignoreEntries,
} from "../src/safety.js";

const DEBUG = Boolean(process.env.GIT_AIC_DEBUG);
const DIFF_OUTPUT_DIR = "git-diffs";

interface CliOptions {
  push?: boolean;
  diff?: boolean;
  all?: boolean;
  yes?: boolean;
  dryRun?: boolean;
}


/* -------------------------------------------------------------------------- */
/*                                   Loader                                   */
/* -------------------------------------------------------------------------- */

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
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${chalk.cyan(frame)} ${message}`);
  };

  const clear = () => {
    if (!process.stdout.isTTY) {
      return;
    }

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    start(nextMessage: string) {
      stopTimer();
      message = nextMessage;
      frameIndex = 0;

      if (!process.stdout.isTTY) {
        console.log(nextMessage);
        return;
      }

      render();
      timer = setInterval(render, arrows_3.speed);
    },
    update(nextMessage: string) {
      message = nextMessage;

      if (!process.stdout.isTTY) {
        console.log(nextMessage);
        return;
      }

      render();
    },
    /** Prints a line above the spinner without corrupting it. */
    notice(text: string) {
      clear();
      console.log(chalk.yellow(text));

      if (timer) {
        render();
      }
    },
    succeed(doneMessage: string) {
      stopTimer();
      clear();
      console.log(chalk.green(`OK ${doneMessage}`));
    },
    stop() {
      stopTimer();
      clear();
    },
  };
};

type Loader = ReturnType<typeof createLoader>;

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

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

const formatStats = (stats: FileChangeStats | undefined, useColor = false) => {
  if (!stats) {
    return "";
  }

  if (stats.binary && stats.additions === 0 && stats.deletions === 0) {
    return useColor ? chalk.gray("(binary)") : "(binary)";
  }

  const add = `+${stats.additions}`;
  const del = `-${stats.deletions}`;
  const binary = stats.binary ? ", binary" : "";

  return useColor
    ? `(${chalk.green(add)}, ${chalk.red(del)}${binary})`
    : `(${add}, ${del}${binary})`;
};

const describeFileNotes = (file: ChangedFile) => {
  const notes: string[] = [];

  if (file.untracked) {
    notes.push("new");
  }

  if (file.from) {
    notes.push("renamed");
  }

  if (file.hasStagedChanges && file.hasUnstagedChanges && !file.untracked) {
    notes.push("partially staged: only staged changes are committed");
  }

  return notes.length > 0 ? ` [${notes.join("; ")}]` : "";
};

const selectFiles = async (
  actionLabel: string,
  files: ChangedFile[],
  stats: Map<string, FileChangeStats>,
  selectAll: boolean,
): Promise<ChangedFile[]> => {
  if (files.length <= 1 || selectAll) {
    return files;
  }

  requireInteractive(
    "Choosing files",
    "Pass --all to include every changed file.",
  );

  const p = await loadPrompts();
  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));

  const selected = await p.multiselect<string>({
    message: `Select the files you want to ${actionLabel}:`,
    options: files.map((file) => ({
      value: file.path,
      label: `${getFileLabel(file)} ${formatStats(stats.get(file.path))}`,
      hint: describeFileNotes(file).replace(/^ \[|\]$/g, "") || undefined,
    })),
    required: false,
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.outro(chalk.yellow("No files selected."));
    throw new UserAbort("No files selected. Nothing was changed.");
  }

  p.outro(chalk.blue(`Using ${selected.length} selected file(s)...`));
  return files.filter((file) => selected.includes(file.path));
};

const writeTempMessageFile = (message: string) => {
  const directory = mkdtempSync(join(tmpdir(), "git-aic-"));
  const filePath = join(directory, "COMMIT_EDITMSG");
  writeFileSync(filePath, `${message}\n`, "utf8");
  return {
    filePath,
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
};

const promptForApiKey = async () => {
  const p = await loadPrompts();
  const entered = await p.password({
    message: "Paste your Gemini API key:",
    validate: (value) =>
      !value?.trim()
        ? "The key cannot be empty"
        : /\s/.test(value.trim())
          ? "API keys cannot contain whitespace"
          : undefined,
  });

  if (p.isCancel(entered)) {
    throw new UserAbort("No key saved.");
  }

  return entered.trim();
};

const saveApiKey = (key: string) => {
  setStoredApiKey(key);
  console.log(chalk.green("API key saved."));
  console.log(
    chalk.gray(`Stored in plain text at ${config.path} (readable only by your user on macOS/Linux).`),
  );
};

/**
 * Called right before the first step that needs Gemini (and before the
 * staging area is touched). Without a key, asks for one instead of failing.
 */
const ensureApiKey = async () => {
  if (resolveApiKey().value) {
    return;
  }

  if (!isInteractive()) {
    throw new MissingApiKeyError();
  }

  await printIntro();
  console.log(chalk.yellow("Git AIC needs a Google Gemini API key to write commit messages."));
  console.log(chalk.gray("Get a free key at https://aistudio.google.com/app/apikey\n"));
  saveApiKey(await promptForApiKey());
  console.log("");
};

const printMissingKeyHelp = () => {
  console.error(chalk.red("\nNo Gemini API key configured.\n"));
  console.log(chalk.yellow("Set one with either option:\n"));
  console.log(chalk.cyan("Store it in your git-aic config (recommended):"));
  console.log("  git-aic set-key\n");
  console.log(chalk.cyan("Or use an environment variable:"));
  console.log(`  macOS / Linux:        export ${API_KEY_ENV}=your_api_key_here`);
  console.log(
    `  Windows (PowerShell): setx ${API_KEY_ENV} "your_api_key_here"   (then restart the terminal)\n`,
  );
  console.log(
    chalk.gray("Get a key at https://aistudio.google.com/app/apikey\n"),
  );
};

/* -------------------------------------------------------------------------- */
/*                         Index safety (commit mode)                         */
/* -------------------------------------------------------------------------- */

let pendingIndexSnapshot: string | null = null;

const restorePendingIndex = () => {
  if (!pendingIndexSnapshot) {
    return false;
  }

  const snapshot = pendingIndexSnapshot;
  pendingIndexSnapshot = null;

  try {
    restoreIndex(snapshot);
    return true;
  } catch (error) {
    console.error(
      chalk.red(
        `Could not restore your previous staging area: ${(error as Error).message}\nRestore it manually with: git read-tree ${snapshot}`,
      ),
    );
    return false;
  }
};

const handleTermination = (signal: NodeJS.Signals) => {
  process.stdout.write("\n");

  if (restorePendingIndex()) {
    console.log(chalk.yellow("Interrupted. Your previous staging area was restored."));
  } else {
    console.log(chalk.yellow("Interrupted."));
  }

  process.exit(signal === "SIGINT" ? 130 : 143);
};

process.on("SIGINT", handleTermination);
process.on("SIGTERM", handleTermination);

// Output piped into a process that exits early (e.g. `| head`) must not leave the index modified.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") {
    restorePendingIndex();
    process.exit(1);
  }
});

/* -------------------------------------------------------------------------- */
/*                                Repository                                  */
/* -------------------------------------------------------------------------- */

const ensureGitRepoOrHandleInit = async (): Promise<"ready" | "exit"> => {
  if (await isInsideGitRepo()) {
    return "ready";
  }

  requireInteractive(
    "This folder is not a Git repository. Initializing one",
    "Run `git init` first.",
  );

  const p = await loadPrompts();
  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));
  console.log(chalk.yellow("This folder is not a Git repository."));

  const shouldInitialize = await p.confirm({ message: "Initialize Git here?" });

  if (p.isCancel(shouldInitialize) || !shouldInitialize) {
    p.outro(chalk.yellow("Git initialization skipped. Exiting."));
    return "exit";
  }

  const initResult = runGit(["init"], { inherit: true });

  if (initResult.status !== 0 || !(await isInsideGitRepo())) {
    throw new UsageError("Git initialization failed.");
  }

  const nextStep = await p.select({
    message: "Git initialized. What do you want to do next?",
    options: [
      { value: "continue", label: "Continue", hint: "resume this git aic command now" },
      { value: "exit", label: "Exit", hint: "stop here and continue manually" },
    ],
  });

  if (p.isCancel(nextStep) || nextStep === "exit") {
    p.outro(chalk.blue("Repository initialized. Exiting."));
    return "exit";
  }

  p.outro(chalk.green("Repository initialized. Continuing..."));
  return "ready";
};

/* -------------------------------------------------------------------------- */
/*                                Commit mode                                 */
/* -------------------------------------------------------------------------- */

/** First-time setup: git refuses to commit without user.name and user.email. */
const ensureCommitIdentity = async () => {
  requireInteractive(
    "Git does not know your name and email yet. Setting them",
    'Set them with: git config --global user.name "Your Name" && git config --global user.email "you@example.com"',
  );

  const p = await loadPrompts();
  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));
  console.log(
    chalk.yellow("Git needs your name and email to record who made each commit."),
  );

  const name = await p.text({
    message: "Your name:",
    initialValue: getConfigValue("user.name"),
    validate: (value) => (value?.trim() ? undefined : "Name cannot be empty"),
  });

  if (p.isCancel(name)) {
    throw new UserAbort("Cancelled. Nothing was changed.");
  }

  const email = await p.text({
    message: "Your email:",
    initialValue: getConfigValue("user.email"),
    placeholder: "you@example.com",
    validate: (value) =>
      /^[^\s@]+@[^\s@]+$/.test(value?.trim() || "") ? undefined : "Enter a valid email address",
  });

  if (p.isCancel(email)) {
    throw new UserAbort("Cancelled. Nothing was changed.");
  }

  const scope = await p.select({
    message: "Save these for:",
    options: [
      { value: "global", label: "All repositories", hint: "git config --global" },
      { value: "local", label: "This repository only" },
    ],
  });

  if (p.isCancel(scope)) {
    throw new UserAbort("Cancelled. Nothing was changed.");
  }

  const global = scope === "global";
  setConfigValue("user.name", name.trim(), global);
  setConfigValue("user.email", email.trim(), global);
  p.outro(chalk.green(`Saved your Git identity${global ? " globally" : " for this repository"}.`));
};

type ReviewChoice = "commit" | "edit" | "regenerate" | "cancel";

const reviewCommitMessage = async (message: string): Promise<ReviewChoice> => {
  const p = await loadPrompts();
  const choice = await p.select<ReviewChoice>({
    message: "Use this commit message?",
    options: [
      { value: "commit", label: "Commit" },
      { value: "edit", label: "Edit", hint: "open it in your git editor, then commit" },
      { value: "regenerate", label: "Regenerate" },
      { value: "cancel", label: "Cancel", hint: "restore the previous staging area" },
    ],
  });

  if (p.isCancel(choice)) {
    return "cancel";
  }

  if (choice === "commit" && !checkCommitMessage(message).valid) {
    const confirmed = await p.confirm({
      message: "The message is not a valid Conventional Commit. Commit anyway?",
      initialValue: false,
    });

    return p.isCancel(confirmed) || !confirmed ? "cancel" : "commit";
  }

  return choice;
};

const printCommitMessage = (message: string) => {
  console.log(chalk.green("\nGenerated commit message:\n"));
  console.log(message.split("\n").map((line) => `  ${line}`).join("\n"));
  console.log("");

  checkCommitMessage(message).problems.forEach((problem) =>
    console.log(chalk.yellow(`Warning: ${problem}`)),
  );
};

/** Nothing to commit: explain why, and offer to push commits that are still local. */
const handleNoChanges = async (options: CliOptions) => {
  if (!hasHeadCommit()) {
    console.log(
      chalk.yellow(
        "This repository is empty: there are no files to commit yet.\nCreate or copy your project files here, then run git aic again.",
      ),
    );
    return;
  }

  const unpushed = countUnpushedCommits();
  const branchName = getBranchName();

  if (unpushed === 0 || !branchName) {
    console.log(
      chalk.yellow(
        getBranchUpstream()
          ? "No changes found. Everything is committed and pushed."
          : "No changes found. Everything is committed.",
      ),
    );
    return;
  }

  const description = `${unpushed} commit${unpushed === 1 ? "" : "s"} on "${branchName}" ${unpushed === 1 ? "has" : "have"} not been pushed yet`;

  if (options.push) {
    console.log(chalk.blue(`No new changes, but ${description}. Pushing...`));
    await pushCurrentBranch(branchName, { yes: options.yes });
    return;
  }

  if (!isInteractive() || options.yes) {
    console.log(chalk.yellow(`No new changes, but ${description}. Run git aic -p to push.`));
    return;
  }

  const p = await loadPrompts();
  const push = await p.confirm({ message: `No new changes, but ${description}. Push now?` });

  if (!p.isCancel(push) && push) {
    await pushCurrentBranch(branchName, { yes: options.yes });
  }
};

const DEFAULT_BRANCH_NAMES = ["main", "master"];

/** Optional (git-aic set-branch-prompt on): offer a feature branch instead of committing to main. */
const maybeSwitchToNewBranch = async (options: CliOptions) => {
  if (!isBranchPromptEnabled() || options.yes || !isInteractive() || !hasHeadCommit()) {
    return;
  }

  const branchName = getBranchName();
  const defaults = new Set([...DEFAULT_BRANCH_NAMES, getRemoteDefaultBranch()].filter(Boolean));

  if (!branchName || !defaults.has(branchName)) {
    return;
  }

  const p = await loadPrompts();
  const choice = await p.select({
    message: `You are on "${branchName}". Where should this commit go?`,
    options: [
      { value: "stay", label: `Commit to ${branchName}` },
      { value: "new", label: "Create a new branch", hint: "your changes come with you" },
    ],
  });

  if (p.isCancel(choice)) {
    throw new UserAbort("Cancelled. Nothing was changed.");
  }

  if (choice === "stay") {
    return;
  }

  const name = await p.text({
    message: "New branch name:",
    placeholder: "feature/short-description",
    validate: (value) => {
      const trimmed = value?.trim() || "";

      if (!trimmed) {
        return "Branch name cannot be empty";
      }

      if (!isValidBranchName(trimmed)) {
        return "That is not a valid Git branch name";
      }

      return branchExists(trimmed) ? `Branch "${trimmed}" already exists` : undefined;
    },
  });

  if (p.isCancel(name)) {
    throw new UserAbort("Cancelled. Nothing was changed.");
  }

  createAndSwitchBranch(name.trim());
  console.log(chalk.green(`Switched to new branch "${name.trim()}".\n`));
};

const runCommitMode = async (options: CliOptions, loader: Loader) => {
  const aiOptions: RequestOptions = { onNotice: (text) => loader.notice(text) };

  const leaveOut = await suggestGitignoreEntries({ yes: options.yes });

  loader.start("Inspecting repository changes");
  const files = (await getChangedFiles()).filter((file) => !isExcludedByPrefix(file, leaveOut));

  if (files.some((file) => file.conflicted)) {
    loader.stop();
    throw new UsageError(
      "This repository has unresolved merge conflicts. Resolve them and stage the results before committing.",
    );
  }

  if (files.length === 0) {
    loader.stop();
    await handleNoChanges(options);
    return;
  }

  // Needed from here on; checked before the staging area is touched.
  if (!resolveApiKey().value) {
    loader.stop();
    await ensureApiKey();
    loader.start("Inspecting repository changes");
  }

  // Ask now rather than letting `git commit` fail after the AI has already run.
  if (!hasCommitIdentity()) {
    loader.stop();
    await ensureCommitIdentity();
    loader.start("Inspecting repository changes");
  }

  loader.stop();
  await maybeSwitchToNewBranch(options);
  loader.start("Inspecting repository changes");

  pendingIndexSnapshot = snapshotIndex();
  let committed = false;

  try {
    const deletedFiles = files.filter((file) => file.deleted && !file.from);
    const selectableFiles = files.filter((file) => !deletedFiles.includes(file));

    if (deletedFiles.length > 0) {
      loader.update(`Auto-staging ${deletedFiles.length} deleted file(s)`);
      stageFiles(deletedFiles);
    }

    loader.update(`Summarizing ${selectableFiles.length} changed file(s)`);
    const stats = new Map(
      selectableFiles.map((file) => [file.path, getCommitChangeStats(file)]),
    );
    loader.stop();

    if (selectableFiles.length > 0) {
      console.log(chalk.blue("\nDetected local changes:"));
      selectableFiles.forEach((file) =>
        console.log(
          `${chalk.cyan("-")} ${getFileLabel(file)} ${formatStats(stats.get(file.path), true)}${chalk.gray(describeFileNotes(file))}`,
        ),
      );
    }

    if (deletedFiles.length > 0) {
      console.log(
        chalk.blue(`\nDeleted files auto-staged and excluded from selection: ${deletedFiles.length}`),
      );
      deletedFiles.forEach((file) => console.log(chalk.gray(`  - ${file.path}`)));
    }

    console.log("");

    const chosenFiles =
      selectableFiles.length > 0
        ? await selectFiles("stage and commit", selectableFiles, stats, Boolean(options.all))
        : [];

    const secretFiles = await confirmSecretRisks(
      findSecretRisks(chosenFiles, getCommitFileDiff),
      "commit",
      { yes: options.yes },
    );
    const selectedFiles = chosenFiles.filter((file) => !secretFiles.includes(file));

    if (chosenFiles.length > 0 && selectedFiles.length === 0 && deletedFiles.length === 0) {
      throw new UserAbort("Nothing left to commit. Your staging area was restored.");
    }

    loader.start("Preparing staged selection");
    const filesToUnstage = selectableFiles.filter(
      (file) => file.hasStagedChanges && !selectedFiles.includes(file),
    );

    if (filesToUnstage.length > 0) {
      loader.update(`Unstaging ${filesToUnstage.length} unselected file(s)`);
      unstageFiles(filesToUnstage);
    }

    // Files that already have staged changes keep exactly what was staged (git add -p is respected).
    const filesToStage = selectedFiles.filter((file) => !file.hasStagedChanges);

    if (filesToStage.length > 0) {
      loader.update(`Staging ${filesToStage.length} selected file(s)`);
      stageFiles(filesToStage);
    }

    if (!hasStagedChanges()) {
      loader.stop();
      throw new UserAbort("Nothing is staged to commit. Your staging area was left unchanged.");
    }

    const stagedEntries = getStagedEntries();
    loader.succeed("Collected staged changes for commit");
    console.log(chalk.blue("\nFiles being committed:"));
    stagedEntries.forEach((entry) =>
      console.log(
        chalk.cyan(`- [${entry.status}] ${entry.from ? `${entry.from} -> ${entry.path}` : entry.path}`),
      ),
    );

    const branchName = getBranchName();
    const stagedDiff = getStagedDiff();

    for (;;) {
      loader.start("Generating commit message with AI");
      const message = await generateCommitMessage(stagedDiff, branchName, aiOptions);
      loader.stop();
      printCommitMessage(message);

      if (options.dryRun) {
        throw new UserAbort("Dry run: nothing was committed and your staging area was restored.");
      }

      let choice: ReviewChoice = "commit";

      if (options.yes) {
        if (!checkCommitMessage(message).valid) {
          throw new UsageError(
            "The generated message is not a valid Conventional Commit, so it was not committed. Run again without --yes to review or edit it.",
          );
        }
      } else {
        requireInteractive(
          "Reviewing the commit message",
          "Pass --yes to commit without review, or --dry-run to only print it.",
        );
        choice = await reviewCommitMessage(message);
      }

      if (choice === "regenerate") {
        continue;
      }

      if (choice === "cancel") {
        throw new UserAbort("Commit cancelled. Your previous staging area was restored.");
      }

      const messageFile = writeTempMessageFile(message);

      try {
        const args = ["commit", ...(choice === "edit" ? ["-e"] : []), "-F", messageFile.filePath];
        console.log(chalk.blue(`> git commit${choice === "edit" ? " -e" : ""} -F <generated message>`));
        const result = runGit(args, { inherit: true });

        if (result.status !== 0) {
          throw new GitCommandError(
            `git commit failed (exit ${result.status}). Your previous staging area was restored.`,
            result.status,
          );
        }
      } finally {
        messageFile.cleanup();
      }

      committed = true;
      pendingIndexSnapshot = null;
      console.log(chalk.green("\nCommit successful"));
      break;
    }

    if (options.push) {
      await pushCurrentBranch(getBranchName(), { yes: options.yes });
    }
  } finally {
    if (!committed) {
      restorePendingIndex();
    }
  }
};

/* -------------------------------------------------------------------------- */
/*                                 Diff mode                                  */
/* -------------------------------------------------------------------------- */

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

/**
 * Keeps generated reports out of commits without editing the tracked
 * .gitignore: the rule goes into .git/info/exclude, which is local only.
 */
const ensureDiffOutputIgnored = () => {
  if (isPathIgnored(`${DIFF_OUTPUT_DIR}/`)) {
    return;
  }

  const excludePath = getInfoExcludePath();
  mkdirSync(dirname(excludePath), { recursive: true });
  const current = existsSync(excludePath) ? readFileSync(excludePath, "utf8") : "";
  const separator = current.length === 0 || current.endsWith("\n") ? "" : "\n";
  appendFileSync(excludePath, `${separator}/${DIFF_OUTPUT_DIR}/\n`, "utf8");
};

interface ReportFile {
  file: ChangedFile;
  diff: string;
}

const createDiffMarkdown = (
  branchName: string,
  headCommit: HeadCommitInfo,
  reportFiles: ReportFile[],
  explanations: Map<string, string>,
) => {
  const sections = reportFiles.map(({ file, diff }) => {
    const body = diff.trimEnd();
    const fence = getMarkdownFence(body);
    const explanation = explanations.get(file.path) || getFallbackExplanation(file.path);

    return [
      `## ${getFileLabel(file)}`,
      "",
      explanation.trim(),
      "",
      `${fence}diff`,
      body,
      fence,
    ].join("\n");
  });

  return [
    "# Proposed Diff",
    "",
    "## Metadata",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Branch: ${branchName || "detached HEAD"}`,
    `- Base Commit: ${headCommit.short}`,
    `- Base Commit Full: ${headCommit.full}`,
    "",
    "## Files",
    "",
    ...reportFiles.map(({ file }) => `- ${getFileLabel(file)}`),
    "",
    ...sections.flatMap((section) => [section, ""]),
  ].join("\n");
};

const runDiffMode = async (options: CliOptions, loader: Loader) => {
  const aiOptions: RequestOptions = { onNotice: (text) => loader.notice(text) };

  const leaveOut = await suggestGitignoreEntries({ yes: options.yes });

  loader.start("Inspecting repository changes");
  const files = (await getChangedFiles()).filter((file) => !isExcludedByPrefix(file, leaveOut));

  if (files.length === 0) {
    loader.stop();
    console.log(chalk.yellow("No changes found in this repository."));
    return;
  }

  if (!resolveApiKey().value) {
    loader.stop();
    await ensureApiKey();
    loader.start("Inspecting repository changes");
  }

  loader.update(`Summarizing ${files.length} changed file(s)`);
  const stats = new Map(files.map((file) => [file.path, getWorkingChangeStats(file)]));
  loader.stop();

  const chosenFiles = await selectFiles(
    "include in the diff report",
    files,
    stats,
    Boolean(options.all),
  );
  const secretFiles = await confirmSecretRisks(
    findSecretRisks(chosenFiles, getWorkingFileDiff),
    "report",
    { yes: options.yes },
  );
  const selectedFiles = chosenFiles.filter((file) => !secretFiles.includes(file));

  loader.start("Collecting selected file diffs");
  const reportFiles = selectedFiles
    .map((file) => ({ file, diff: getWorkingFileDiff(file) }))
    .filter(({ diff }) => diff.trim().length > 0);

  if (reportFiles.length === 0) {
    loader.stop();
    console.log(chalk.yellow("The selected files have no diff content to report."));
    return;
  }

  loader.succeed("Collected selected changes for the diff report");
  console.log(chalk.blue("\nFiles being documented:"));
  reportFiles.forEach(({ file }) => console.log(chalk.cyan(`- ${getFileLabel(file)}`)));
  console.log("");

  const branchName = getBranchName();
  const headCommit = getHeadCommitInfo();
  const outputDirectory = join(getRepoRoot(), DIFF_OUTPUT_DIR);

  loader.start("Preparing git-diffs output folder");
  mkdirSync(outputDirectory, { recursive: true });
  ensureDiffOutputIgnored();

  loader.update("Generating AI report filename");
  const aiFileName = await generateDiffFileName(
    reportFiles.map(({ diff }) => diff).join("\n"),
    aiOptions,
  );
  const markdownPath = getAvailableMarkdownPath(outputDirectory, aiFileName);

  loader.update(`Explaining diffs with AI (${reportFiles.length} files)`);
  const explanations = await generateDiffExplanations(
    reportFiles.map(({ file, diff }) => ({ filePath: file.path, diff })),
    branchName,
    aiOptions,
  );

  loader.update("Writing markdown report");
  writeFileSync(
    markdownPath,
    createDiffMarkdown(branchName, headCommit, reportFiles, explanations),
    "utf8",
  );
  loader.succeed(
    `Diff markdown written to ${relative(process.cwd(), markdownPath) || markdownPath}`,
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Commands                                  */
/* -------------------------------------------------------------------------- */

const program = new Command();

program
  .name("git-aic")
  .description("AI-generated Conventional Commits and diff reports, powered by Google Gemini")
  .version(getPackageVersion(), "-V, --version", "print the git-aic version")
  .option("-p, --push", "push after committing")
  .option("-d, --diff", "write selected changes to a markdown diff report")
  .option("-a, --all", "use every changed file without showing the file selector")
  .option("-y, --yes", "commit (and set upstream) without asking for confirmation")
  .option("--dry-run", "generate and print the commit message without committing")
  .helpCommand("help [command]", "display help for git-aic or a command");

const maskKey = (key: string) =>
  key.length > 12 ? `${key.slice(0, 4)}${"*".repeat(8)}${key.slice(-4)}` : "*".repeat(8);

program
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const apiKey = resolveApiKey();
    const model = resolveModel();
    const keySource =
      apiKey.source === "env"
        ? `from ${API_KEY_ENV} (overrides any stored key)`
        : apiKey.source === "config"
          ? "from git-aic config"
          : "";
    const modelSource =
      model.source === "env"
        ? `from ${MODEL_ENV}`
        : model.source === "config"
          ? "from git-aic config"
          : "default";

    console.log(
      chalk.cyan(`API Key:     ${apiKey.value ? `${maskKey(apiKey.value)} ${chalk.gray(keySource)}` : "not set"}`),
    );
    console.log(chalk.cyan(`Model:       ${model.value} ${chalk.gray(modelSource)}`));
    console.log(chalk.cyan(`Branch prompt: ${isBranchPromptEnabled() ? "on" : "off"}`));
    console.log(chalk.cyan(`Config path: ${config.path}`));
  });

program
  .command("set-key [key]")
  .description("Store your Gemini API key (prompts for it when omitted)")
  .action(async (keyArgument?: string) => {
    let key = keyArgument?.trim() || "";

    if (!key) {
      requireInteractive("Entering the API key", "Pass it as an argument: git-aic set-key <key>");
      key = await promptForApiKey();
    }

    if (/\s/.test(key)) {
      throw new UsageError("API keys cannot contain whitespace.");
    }

    saveApiKey(key);

    if (keyArgument) {
      console.log(
        chalk.gray("Tip: run `git-aic set-key` without an argument to keep the key out of your shell history."),
      );
    }

    if (process.env[API_KEY_ENV]) {
      console.log(chalk.yellow(`Note: ${API_KEY_ENV} is set and takes precedence over the stored key.`));
    }
  });

program
  .command("set-model <model>")
  .description(`Set the Gemini model to use (default: ${DEFAULT_MODEL}; pass "default" to reset)`)
  .action((model: string) => {
    const value = model.trim();

    if (value === "default") {
      clearStoredModel();
      console.log(chalk.green(`Model reset to ${DEFAULT_MODEL}.`));
      return;
    }

    if (!isValidModelName(value)) {
      throw new UsageError(`"${value}" is not a valid model name (example: ${DEFAULT_MODEL}).`);
    }

    setStoredModel(value);
    console.log(chalk.green(`Model set to ${value}.`));
  });

program
  .command("set-branch-prompt <state>")
  .description('Ask to create a new branch before committing on main/master ("on" or "off"; off by default)')
  .action((state: string) => {
    const value = state.trim().toLowerCase();

    if (!["on", "off"].includes(value)) {
      throw new UsageError('Use "on" or "off".');
    }

    setBranchPromptEnabled(value === "on");
    console.log(
      chalk.green(
        value === "on"
          ? "Branch prompt on: git aic will offer to create a branch before committing on main/master."
          : "Branch prompt off.",
      ),
    );
  });

program
  .command("alias")
  .description("Set up the 'git aic' alias")
  .action(() => {
    const result = runGit(["config", "--global", "alias.aic", "!git-aic"]);

    if (result.status !== 0) {
      throw new UsageError(
        `Failed to set up the alias: ${result.stderr.trim() || `git exited with ${result.status}`}`,
      );
    }

    console.log(chalk.green("Alias 'git aic' set up successfully."));
    console.log(chalk.cyan("Now you can use 'git aic' instead of 'git-aic'!"));
    console.log(
      chalk.yellow(
        "\nNote: use 'git aic help' or 'git aic -h' for help. 'git aic --help' is reserved by Git for its own documentation.",
      ),
    );
  });

const loader = createLoader();

program.action(async (options: CliOptions) => {
  if (options.diff && options.push) {
    throw new UsageError("--push cannot be combined with --diff (diff mode never commits).");
  }

  if (options.diff && options.dryRun) {
    throw new UsageError("--dry-run only applies to commit mode; --diff never commits.");
  }

  // Repository first, so a brand-new folder gets the "initialize Git?" prompt
  // even before an API key is set up.
  if ((await ensureGitRepoOrHandleInit()) === "exit") {
    return;
  }

  initRepoRoot();

  if (options.diff) {
    await runDiffMode(options, loader);
  } else {
    await runCommitMode(options, loader);
  }
});

const handleError = (error: unknown) => {
  loader.stop();

  if (error instanceof UserAbort) {
    console.log(chalk.yellow(error.message));
    return 0;
  }

  if (error instanceof MissingApiKeyError) {
    printMissingKeyHelp();
    return 1;
  }

  const isDiff = process.argv.includes("--diff") || process.argv.includes("-d");
  const label = isDiff ? "Diff report failed" : "git-aic failed";
  const message =
    error instanceof UsageError ||
    error instanceof GitCommandError ||
    error instanceof GeminiRequestError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  console.error(chalk.red(`\n${label}: ${message}`));

  if (DEBUG && error instanceof Error && error.stack) {
    console.error(chalk.gray(error.stack));
  } else if (!(error instanceof UsageError)) {
    console.error(chalk.gray("Set GIT_AIC_DEBUG=1 for more details."));
  }

  return 1;
};

normalizeLegacyDiffFlag();
program
  .parseAsync(process.argv)
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error: unknown) => {
    process.exit(handleError(error));
  });
