import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";
import { spawn, spawnSync } from "child_process";
import { existsSync } from "fs";

/**
 * All paths reported by `git status` are relative to the repository root, so
 * every git command (simple-git and spawned) runs from the root. This keeps the
 * tool working when it is launched from a subdirectory.
 */
let repoRoot = process.cwd();
let git: SimpleGit = simpleGit();

export class GitCommandError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly stderr = "",
  ) {
    super(message);
    this.name = "GitCommandError";
  }
}

export interface RunGitOptions {
  input?: string;
  /** Inherit the terminal (needed for editors, hooks, credential prompts). */
  inherit?: boolean;
  /** Extra environment variables for this git invocation. */
  env?: Record<string, string>;
}

export interface RunGitResult {
  status: number;
  stdout: string;
  stderr: string;
}

export const runGit = (
  args: string[],
  options: RunGitOptions = {},
): RunGitResult => {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    input: options.input,
    stdio: options.inherit ? "inherit" : "pipe",
    env: options.env ? { ...process.env, ...options.env } : process.env,
    maxBuffer: 512 * 1024 * 1024,
  });

  if (result.error) {
    throw new GitCommandError(
      `Failed to run git ${args[0]}: ${result.error.message}`,
      null,
    );
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const runGitOrThrow = (args: string[], description: string) => {
  const result = runGit(args);

  if (result.status !== 0) {
    throw new GitCommandError(
      `${description}: ${result.stderr.trim() || `git ${args[0]} exited with ${result.status}`}`,
      result.status,
      result.stderr,
    );
  }

  return result.stdout;
};

export const isInsideGitRepo = async () => simpleGit().checkIsRepo();

export const initRepoRoot = () => {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const root = (result.stdout || "").trim();

  if (result.status !== 0 || !root) {
    throw new GitCommandError(
      "Could not locate the repository working tree. Run git-aic from inside a non-bare repository's working tree.",
      result.status,
      result.stderr || "",
    );
  }

  repoRoot = root;
  git = simpleGit({ baseDir: root });
  emptyTreeHash = null;
  return root;
};

export const getRepoRoot = () => repoRoot;

/* -------------------------------------------------------------------------- */
/*                                  Status                                    */
/* -------------------------------------------------------------------------- */

export interface ChangedFile {
  /** Repo-root-relative path (the new path for renames/copies). */
  path: string;
  /** Original path for renames/copies. */
  from?: string;
  index: string;
  workingDir: string;
  untracked: boolean;
  deleted: boolean;
  conflicted: boolean;
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
}

export const getChangedFiles = async (): Promise<ChangedFile[]> => {
  const status = await git.status();

  return status.files
    .filter((file) => file.index !== "!" && file.working_dir !== "!")
    .map((file) => {
      const untracked = file.index === "?";
      const conflicted = status.conflicted.includes(file.path);

      return {
        path: file.path,
        from: file.from && file.from !== file.path ? file.from : undefined,
        index: file.index,
        workingDir: file.working_dir,
        untracked,
        deleted: !untracked && (file.index === "D" || file.working_dir === "D"),
        conflicted,
        hasStagedChanges: !untracked && file.index.trim().length > 0,
        hasUnstagedChanges: untracked || file.working_dir.trim().length > 0,
      };
    });
};

export const getFilePathspecs = (file: ChangedFile) =>
  file.from ? [file.from, file.path] : [file.path];

export const getFileLabel = (file: ChangedFile) =>
  file.from ? `${file.from} -> ${file.path}` : file.path;

/* -------------------------------------------------------------------------- */
/*                                 Revisions                                  */
/* -------------------------------------------------------------------------- */

let emptyTreeHash: string | null = null;

export const hasHeadCommit = () =>
  runGit(["rev-parse", "--verify", "-q", "HEAD"]).status === 0;

const getEmptyTreeHash = () => {
  if (!emptyTreeHash) {
    const result = runGit(["hash-object", "-t", "tree", "--stdin"], {
      input: "",
    });

    if (result.status !== 0) {
      throw new GitCommandError(
        `Failed to compute the empty tree: ${result.stderr.trim()}`,
        result.status,
        result.stderr,
      );
    }

    emptyTreeHash = result.stdout.trim();
  }

  return emptyTreeHash;
};

/** HEAD, or the empty tree in a repository without commits. */
const getBaseRevision = () => (hasHeadCommit() ? "HEAD" : getEmptyTreeHash());

export interface HeadCommitInfo {
  short: string;
  full: string;
}

export const getHeadCommitInfo = (): HeadCommitInfo => {
  if (!hasHeadCommit()) {
    return { short: "none", full: "none (no commits yet)" };
  }

  return {
    full: runGitOrThrow(["rev-parse", "HEAD"], "Failed to read HEAD").trim(),
    short: runGitOrThrow(
      ["rev-parse", "--short", "HEAD"],
      "Failed to read HEAD",
    ).trim(),
  };
};

/** Current branch name, or "" when HEAD is detached. Works before the first commit. */
export const getBranchName = () => {
  const result = runGit(["symbolic-ref", "--short", "-q", "HEAD"]);
  return result.status === 0 ? result.stdout.trim() : "";
};

export const getBranchUpstream = () => {
  const result = runGit([
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  ]);

  return result.status === 0 ? result.stdout.trim() : "";
};

export const getRemotes = () =>
  runGit(["remote"])
    .stdout.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export const addRemote = (name: string, url: string) =>
  runGitOrThrow(["remote", "add", name, url], `Failed to add remote "${name}"`);

export const removeRemote = (name: string) => {
  runGit(["remote", "remove", name]);
};

/** True when git can determine an author and committer identity (config or env vars). */
export const hasCommitIdentity = () =>
  runGit(["var", "GIT_AUTHOR_IDENT"]).status === 0 &&
  runGit(["var", "GIT_COMMITTER_IDENT"]).status === 0;

export const getConfigValue = (key: string) => {
  const result = runGit(["config", "--get", key]);
  return result.status === 0 ? result.stdout.trim() : "";
};

export const setConfigValue = (key: string, value: string, global: boolean) =>
  runGitOrThrow(
    ["config", ...(global ? ["--global"] : []), key, value],
    `Failed to set ${key}`,
  );

/**
 * Runs git with the terminal attached (so credential managers, SSH and git's
 * own prompts can ask the user for input) while also capturing stderr, which
 * is echoed live and returned so failures can be diagnosed.
 */
export const streamGit = (
  args: string[],
  options: { env?: Record<string, string>; quietStdout?: boolean } = {},
): Promise<{ status: number; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: repoRoot,
      stdio: ["inherit", options.quietStdout ? "ignore" : "inherit", "pipe"],
      env: options.env ? { ...process.env, ...options.env } : process.env,
    });
    const chunks: Buffer[] = [];

    child.stderr?.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      process.stderr.write(chunk);
    });
    child.on("error", (error) =>
      reject(new GitCommandError(`Failed to run git ${args[0]}: ${error.message}`, null)),
    );
    child.on("close", (code) =>
      resolve({ status: code ?? 1, stderr: Buffer.concat(chunks).toString("utf8") }),
    );
  });

export const getRemoteUrl = (name: string) => {
  const result = runGit(["remote", "get-url", name]);
  return result.status === 0 ? result.stdout.trim() : "";
};

export const setRemoteUrl = (name: string, url: string) =>
  runGitOrThrow(["remote", "set-url", name, url], `Failed to update remote "${name}"`);

/** Credential helpers that apply to a URL (empty when none is configured). */
export const getCredentialHelpers = (url: string) =>
  runGit(["config", "--get-urlmatch", "--get-all", "credential.helper", url])
    .stdout.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** Commits on HEAD that are not on the upstream (or on any remote when there is no upstream). */
export const countUnpushedCommits = () => {
  if (!hasHeadCommit()) {
    return 0;
  }

  const upstream = getBranchUpstream();
  const result = runGit(
    upstream
      ? ["rev-list", "--count", `${upstream}..HEAD`]
      : ["rev-list", "--count", "HEAD", "--not", "--remotes"],
  );

  return result.status === 0 ? Number(result.stdout.trim()) || 0 : 0;
};

export const isRebaseInProgress = () =>
  ["rebase-merge", "rebase-apply"].some((name) => {
    const path = runGit(["rev-parse", "--path-format=absolute", "--git-path", name]).stdout.trim();
    return path.length > 0 && existsSync(path);
  });

export const abortRebase = () => {
  runGit(["rebase", "--abort"]);
};

export const isValidBranchName = (name: string) =>
  runGit(["check-ref-format", "--branch", name]).status === 0;

export const branchExists = (name: string) =>
  runGit(["rev-parse", "--verify", "-q", `refs/heads/${name}`]).status === 0;

/** Creates a branch at HEAD and switches to it, keeping the working tree and staging area. */
export const createAndSwitchBranch = (name: string) =>
  runGitOrThrow(["checkout", "-q", "-b", name], `Failed to create branch "${name}"`);

/** e.g. "main" from refs/remotes/origin/HEAD, or "" when unknown. */
export const getRemoteDefaultBranch = (remote = "origin") => {
  const result = runGit(["symbolic-ref", "--short", "-q", `refs/remotes/${remote}/HEAD`]);
  return result.status === 0 ? result.stdout.trim().replace(`${remote}/`, "") : "";
};

/**
 * Untracked entries with new directories collapsed to one entry ("node_modules/"),
 * so huge directories are cheap to inspect.
 */
export const getCollapsedUntrackedEntries = () =>
  runGit(["status", "--porcelain=v1", "-z", "--untracked-files=normal"])
    .stdout.split("\0")
    .filter((entry) => entry.startsWith("?? "))
    .map((entry) => entry.slice(3));

export const getConfiguredBranchRemote = (branchName: string) => {
  const result = runGit(["config", "--get", `branch.${branchName}.remote`]);
  return result.status === 0 ? result.stdout.trim() : "";
};

/* -------------------------------------------------------------------------- */
/*                                 Diff stats                                 */
/* -------------------------------------------------------------------------- */

export interface FileChangeStats {
  additions: number;
  deletions: number;
  binary: boolean;
}

const parseNumstat = (output: string): FileChangeStats => {
  const stats: FileChangeStats = { additions: 0, deletions: 0, binary: false };

  output.split(/\r?\n/).forEach((line) => {
    const [added, removed] = line.split("\t");

    if (added === undefined || removed === undefined) {
      return;
    }

    if (added === "-" || removed === "-") {
      stats.binary = true;
      return;
    }

    stats.additions += Number(added) || 0;
    stats.deletions += Number(removed) || 0;
  });

  return stats;
};

const untrackedDiffArgs = (path: string, extra: string[] = []) => [
  "diff",
  "--no-index",
  ...extra,
  "--",
  "/dev/null",
  path,
];

/** `git diff --no-index` exits with 1 when the files differ, which is the normal case. */
const runNoIndexDiff = (path: string, extra: string[] = []) => {
  const result = runGit(untrackedDiffArgs(path, extra));
  return result.status <= 1 ? result.stdout : "";
};

/**
 * Line counts for what a commit would include for this file: the staged
 * changes if the file has any (partial staging is respected), otherwise the
 * working-tree changes that selecting it would stage.
 */
export const getCommitChangeStats = (file: ChangedFile): FileChangeStats => {
  if (file.untracked) {
    return parseNumstat(runNoIndexDiff(file.path, ["--numstat"]));
  }

  const args = file.hasStagedChanges
    ? ["diff", "--cached", "-M", "--numstat", "--", ...getFilePathspecs(file)]
    : ["diff", "-M", "--numstat", "--", ...getFilePathspecs(file)];

  return parseNumstat(runGit(args).stdout);
};

/** Line counts for the working tree compared with HEAD (staged + unstaged). */
export const getWorkingChangeStats = (file: ChangedFile): FileChangeStats => {
  if (file.untracked) {
    return parseNumstat(runNoIndexDiff(file.path, ["--numstat"]));
  }

  return parseNumstat(
    runGit([
      "diff",
      getBaseRevision(),
      "-M",
      "--numstat",
      "--",
      ...getFilePathspecs(file),
    ]).stdout,
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Diffs                                    */
/* -------------------------------------------------------------------------- */

/** The diff a commit would include for this file (mirrors getCommitChangeStats). */
export const getCommitFileDiff = (file: ChangedFile) => {
  if (file.untracked) {
    return runNoIndexDiff(file.path);
  }

  return runGit(
    file.hasStagedChanges
      ? ["diff", "--cached", "-M", "--", ...getFilePathspecs(file)]
      : ["diff", "-M", "--", ...getFilePathspecs(file)],
  ).stdout;
};

/** Working tree compared with HEAD for one file, including untracked and deleted files. */
export const getWorkingFileDiff = (file: ChangedFile) => {
  if (file.untracked) {
    return runNoIndexDiff(file.path);
  }

  return runGit([
    "diff",
    getBaseRevision(),
    "-M",
    "--",
    ...getFilePathspecs(file),
  ]).stdout;
};

export const hasStagedChanges = () =>
  runGit(["diff", "--cached", "--quiet"]).status === 1;

/** The staged diff used to generate the commit message. */
export const getStagedDiff = () => {
  const diff = runGitOrThrow(
    ["diff", "--cached", "-M", "--ignore-space-at-eol"],
    "Failed to read staged changes",
  );

  if (diff.trim()) {
    return diff;
  }

  // Whitespace/line-ending-only changes: describe them by stat instead.
  return runGitOrThrow(
    ["diff", "--cached", "-M", "--stat"],
    "Failed to read staged changes",
  );
};

export interface StagedEntry {
  status: string;
  path: string;
  from?: string;
}

export const getStagedEntries = (): StagedEntry[] => {
  const output = runGitOrThrow(
    ["diff", "--cached", "-M", "--name-status", "-z"],
    "Failed to list staged files",
  );
  const parts = output.split("\0").filter((part) => part.length > 0);
  const entries: StagedEntry[] = [];

  for (let index = 0; index < parts.length; ) {
    const status = parts[index];
    index += 1;

    if (/^[RC]/.test(status)) {
      entries.push({ status: status[0], from: parts[index], path: parts[index + 1] });
      index += 2;
    } else {
      entries.push({ status, path: parts[index] });
      index += 1;
    }
  }

  return entries;
};

/* -------------------------------------------------------------------------- */
/*                                   Index                                    */
/* -------------------------------------------------------------------------- */

export const stageFiles = (files: ChangedFile[]) => {
  if (files.length === 0) {
    return;
  }

  runGitOrThrow(
    ["add", "-A", "--", ...files.flatMap(getFilePathspecs)],
    "Failed to stage files",
  );
};

export const unstageFiles = (files: ChangedFile[]) => {
  if (files.length === 0) {
    return;
  }

  const pathspecs = files.flatMap(getFilePathspecs);
  const args = hasHeadCommit()
    ? ["restore", "--staged", "--", ...pathspecs]
    : ["rm", "--cached", "-r", "-q", "--ignore-unmatch", "--", ...pathspecs];

  runGitOrThrow(args, "Failed to unstage files");
};

/** Records the index as a tree so it can be restored if the commit does not happen. */
export const snapshotIndex = () =>
  runGitOrThrow(
    ["write-tree"],
    "Could not snapshot the staging area (are there unresolved merge conflicts?)",
  ).trim();

export const restoreIndex = (tree: string) => {
  runGitOrThrow(["read-tree", tree], "Failed to restore the staging area");
  runGit(["update-index", "-q", "--refresh"]);
};

/* -------------------------------------------------------------------------- */
/*                              git-diffs output                              */
/* -------------------------------------------------------------------------- */

export const isPathIgnored = (path: string) =>
  runGit(["check-ignore", "-q", "--", path]).status === 0;

/** Path of .git/info/exclude (local, untracked ignore rules). */
export const getInfoExcludePath = () =>
  runGitOrThrow(
    ["rev-parse", "--path-format=absolute", "--git-path", "info/exclude"],
    "Failed to locate .git/info/exclude",
  ).trim();
