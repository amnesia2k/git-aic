import chalk from "chalk";
import { existsSync } from "fs";
import {
  GitCommandError,
  abortRebase,
  addRemote,
  getBranchUpstream,
  getConfigValue,
  getConfiguredBranchRemote,
  getCredentialHelpers,
  getRemoteUrl,
  getRemotes,
  isRebaseInProgress,
  removeRemote,
  runGit,
  setRemoteUrl,
  streamGit,
} from "./git.js";
import { UserAbort, isInteractive, loadPrompts, requireInteractive } from "./ui.js";

export interface PushOptions {
  /** Skip confirmations (set upstream, pull before pushing) where it is safe. */
  yes?: boolean;
}

const DEFAULT_REMOTE = "origin";
const MAX_RECOVERY_ATTEMPTS = 5;

/* -------------------------------------------------------------------------- */
/*                                 Credentials                                */
/* -------------------------------------------------------------------------- */

interface Credentials {
  username: string;
  password: string;
}

/**
 * Credentials typed into git-aic are handed to git through a throwaway
 * credential helper that reads them from environment variables. They are never
 * written to disk or placed on the command line, and they only live for this run.
 */
const IN_MEMORY_HELPER =
  '!f() { test "$1" = get || exit 0; printf "%s\\n" "username=$GIT_AIC_USERNAME" "password=$GIT_AIC_PASSWORD"; }; f';

let sessionCredentials: Credentials | undefined;
let credentialsNeedSaving = false;

const withCredentials = (args: string[]) =>
  sessionCredentials
    ? ["-c", "credential.helper=", "-c", `credential.helper=${IN_MEMORY_HELPER}`, ...args]
    : args;

const credentialEnv = (): Record<string, string> =>
  sessionCredentials
    ? {
        GIT_AIC_USERNAME: sessionCredentials.username,
        GIT_AIC_PASSWORD: sessionCredentials.password,
      }
    : {};

/** Environment for a background check that must never wait for input. */
const nonInteractiveEnv = (): Record<string, string> => {
  const env: Record<string, string> = {
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "never",
    ...credentialEnv(),
  };

  // Only add BatchMode when the user has not configured their own SSH command.
  if (!process.env.GIT_SSH_COMMAND && !process.env.GIT_SSH && !getConfigValue("core.sshCommand")) {
    env.GIT_SSH_COMMAND = "ssh -o BatchMode=yes -o ConnectTimeout=15";
  }

  return env;
};

const parseHttpsUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed : null;
  } catch {
    return null;
  }
};

/** git@github.com:owner/repo.git or ssh://git@host/owner/repo.git -> https://host/owner/repo.git */
const toHttpsUrl = (url: string) => {
  const scp = /^[\w.-]+@([\w.-]+):(?!\/)(.+)$/.exec(url);

  if (scp) {
    return `https://${scp[1]}/${scp[2]}`;
  }

  const ssh = /^ssh:\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/(.+)$/.exec(url);
  return ssh ? `https://${ssh[1]}/${ssh[2]}` : "";
};

const TOKEN_HINTS: Record<string, { label: string; hint: string }> = {
  "github.com": {
    label: "Personal access token",
    hint: "GitHub no longer accepts account passwords for Git. Create a token with repository write access at https://github.com/settings/tokens",
  },
  "gitlab.com": {
    label: "Personal access token",
    hint: "Create a token with the write_repository scope at https://gitlab.com/-/user_settings/personal_access_tokens",
  },
  "bitbucket.org": {
    label: "App password / API token",
    hint: "Create one with repository write access in your Bitbucket personal settings",
  },
};

const promptForCredentials = async (url: string): Promise<boolean> => {
  const parsed = parseHttpsUrl(url);
  const host = parsed?.host || "the remote";
  const tokenInfo = TOKEN_HINTS[parsed?.hostname || ""] || {
    label: "Password or access token",
    hint: "",
  };
  const p = await loadPrompts();

  console.log(chalk.yellow(`\nSign in to ${host} to push.`));

  if (tokenInfo.hint) {
    console.log(chalk.gray(tokenInfo.hint));
  }

  const username = await p.text({
    message: "Username:",
    initialValue: decodeURIComponent(parsed?.username || "") || sessionCredentials?.username || "",
    validate: (value) => (value?.trim() ? undefined : "Username cannot be empty"),
  });

  if (p.isCancel(username)) {
    return false;
  }

  const password = await p.password({
    message: `${tokenInfo.label}:`,
    validate: (value) => (value ? undefined : "This cannot be empty"),
  });

  if (p.isCancel(password)) {
    return false;
  }

  sessionCredentials = { username: username.trim(), password };
  credentialsNeedSaving = true;
  return true;
};

/** After a successful push, offer to keep typed credentials in the user's credential helper. */
const offerToSaveCredentials = async (remote: string) => {
  if (!sessionCredentials || !credentialsNeedSaving) {
    return;
  }

  credentialsNeedSaving = false;
  const url = parseHttpsUrl(getRemoteUrl(remote));

  if (!url) {
    return;
  }

  const helpers = getCredentialHelpers(url.href);

  if (helpers.length === 0) {
    console.log(
      chalk.gray(
        "Tip: to avoid signing in on every push, install Git Credential Manager (https://aka.ms/gcm) or, for GitHub, run `gh auth login`.",
      ),
    );
    return;
  }

  if (!isInteractive()) {
    return;
  }

  const p = await loadPrompts();
  const save = await p.confirm({
    message: `Save these credentials with your Git credential helper (${helpers.join(", ")}) so you are not asked again?`,
  });

  if (p.isCancel(save) || !save) {
    return;
  }

  const input = [
    `protocol=${url.protocol.replace(":", "")}`,
    `host=${url.host}`,
    `username=${sessionCredentials.username}`,
    `password=${sessionCredentials.password}`,
    "",
    "",
  ].join("\n");
  const result = runGit(["credential", "approve"], { input });

  console.log(
    result.status === 0
      ? chalk.green("Credentials saved.")
      : chalk.yellow("Could not save the credentials; you may be asked again next time."),
  );
};

/* -------------------------------------------------------------------------- */
/*                              Failure diagnosis                             */
/* -------------------------------------------------------------------------- */

export type FailureKind = "rejected" | "not-found" | "auth" | "ssh" | "network" | "other";

export const classifyFailure = (stderr: string): FailureKind => {
  const text = stderr.toLowerCase();

  if (/\[rejected\]|non-fast-forward|fetch first|updates were rejected/.test(text)) {
    return "rejected";
  }

  if (/repository not found|does not appear to be a git repository|project you were looking for could not be found|returned error: 404/.test(text)) {
    return "not-found";
  }

  if (
    /could not read (username|password)|authentication failed|invalid username or (password|token)|terminal prompts disabled|access denied|returned error: 40[13]|permission to .+ denied|password authentication was removed|logon failed/.test(
      text,
    )
  ) {
    return "auth";
  }

  if (/permission denied \(publickey|host key verification failed|no supported authentication methods|could not read from remote repository|bad passphrase/.test(text)) {
    return "ssh";
  }

  if (/could not resolve host|failed to connect|connection timed out|operation timed out|network is unreachable|connection refused|couldn't connect|ssl/.test(text)) {
    return "network";
  }

  return "other";
};

const firstErrorLine = (stderr: string) =>
  stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(fatal|error|remote: (error|fatal|support|invalid))/i.test(line)) ||
  stderr.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ||
  "unknown error";

/** https://..., ssh://..., git@host:owner/repo.git, or an existing local path. */
export const looksLikeRemoteUrl = (value: string) =>
  /^(https?|ssh|git|file):\/\/\S+$/i.test(value) ||
  /^[\w.-]+@[\w.-]+:\S+$/.test(value) ||
  existsSync(value);

const askForRemoteUrl = async (message: string): Promise<string | null> => {
  const p = await loadPrompts();
  const entered = await p.text({
    message,
    placeholder: "https://github.com/you/repo.git or git@github.com:you/repo.git",
    validate: (value) => {
      const trimmed = value?.trim() || "";
      return !trimmed || looksLikeRemoteUrl(trimmed)
        ? undefined
        : "That does not look like a Git URL (https://..., ssh://..., or git@host:owner/repo.git)";
    },
  });

  return p.isCancel(entered) || !entered.trim() ? null : entered.trim();
};

type AccessResult = "ok" | "skip" | "change-url";

/**
 * Makes sure the remote can be reached, walking the user through whatever is
 * missing: signing in (through their credential manager, or by typing a
 * username and token), letting SSH ask for a host confirmation or passphrase,
 * switching an SSH URL to HTTPS, or retrying after a network problem.
 */
const ensureRemoteAccess = async (
  remote: string,
  initialFailure?: string,
): Promise<AccessResult> => {
  const p = await loadPrompts();
  let triedCredentialManager = false;
  let pendingFailure = initialFailure;

  for (let attempt = 0; attempt < MAX_RECOVERY_ATTEMPTS + 3; attempt += 1) {
    let stderr = pendingFailure;
    pendingFailure = undefined;

    if (stderr === undefined) {
      const probe = runGit(withCredentials(["ls-remote", "--heads", remote]), {
        env: nonInteractiveEnv(),
      });

      if (probe.status === 0) {
        return "ok";
      }

      stderr = probe.stderr;
    }

    const kind = classifyFailure(stderr);
    const url = getRemoteUrl(remote);
    const isHttps = Boolean(parseHttpsUrl(url));
    const httpsAlternative = isHttps ? "" : toHttpsUrl(url);

    if (!isInteractive()) {
      throw new GitCommandError(
        `Cannot reach remote "${remote}" (${url}): ${firstErrorLine(stderr)}`,
        null,
        stderr,
      );
    }

    const reasons: Record<FailureKind, string> = {
      auth: "The remote needs you to sign in.",
      "not-found": "The repository was not found. The URL may be wrong, or your account may not have access to it.",
      ssh: "SSH could not authenticate you.",
      network: "The remote could not be reached over the network.",
      rejected: "The remote rejected the request.",
      other: "The remote returned an error.",
    };
    console.log(chalk.yellow(`\n${reasons[kind]}`));
    console.log(chalk.gray(`  ${firstErrorLine(stderr)}`));

    type Choice = "sign-in" | "interactive" | "https" | "retry" | "change-url" | "push" | "skip";
    const options: Array<{ value: Choice; label: string; hint?: string }> = [];

    if (isHttps && (kind === "auth" || kind === "not-found" || kind === "other")) {
      options.push({
        value: "sign-in",
        label: kind === "auth" ? "Sign in" : "Sign in with a different account",
        hint: "opens your credential manager, or asks for a username and token",
      });
    }

    if (kind === "ssh" || (!isHttps && kind === "other")) {
      options.push({
        value: "interactive",
        label: "Connect interactively",
        hint: "lets SSH confirm the host or ask for your key passphrase",
      });
    }

    if (httpsAlternative && (kind === "ssh" || kind === "not-found" || kind === "other")) {
      options.push({ value: "https", label: "Switch to HTTPS", hint: httpsAlternative });
    }

    if (kind === "network") {
      options.push({ value: "retry", label: "Try again" });
    }

    options.push({ value: "change-url", label: "Use a different URL" });

    if (kind === "other" || kind === "not-found") {
      options.push({ value: "push", label: "Try pushing anyway" });
    }

    options.push({ value: "skip", label: "Skip pushing", hint: "the commit stays local" });

    const choice = await p.select<Choice>({ message: "What do you want to do?", options });

    if (p.isCancel(choice) || choice === "skip") {
      return "skip";
    }

    switch (choice) {
      case "push":
        return "ok";
      case "change-url":
        return "change-url";
      case "retry":
        break;
      case "https":
        console.log(chalk.blue(`> git remote set-url ${remote} ${httpsAlternative}`));
        setRemoteUrl(remote, httpsAlternative);
        break;
      case "interactive": {
        const result = await streamGit(withCredentials(["ls-remote", "--heads", remote]), {
          env: credentialEnv(),
          quietStdout: true,
        });

        if (result.status === 0) {
          return "ok";
        }

        pendingFailure = result.stderr;
        break;
      }
      case "sign-in": {
        // First choice: the user's own credential manager (e.g. the Git Credential
        // Manager sign-in window), which also remembers the login for next time.
        if (!triedCredentialManager && !sessionCredentials && getCredentialHelpers(url).length > 0) {
          triedCredentialManager = true;
          console.log(chalk.blue("Opening your Git credential manager to sign in..."));
          const result = await streamGit(["ls-remote", "--heads", remote], { quietStdout: true });

          if (result.status === 0) {
            return "ok";
          }

          console.log(chalk.yellow("Sign-in through the credential manager did not work. Enter your credentials here instead."));
        }

        if (!(await promptForCredentials(url))) {
          return "skip";
        }

        break;
      }
    }
  }

  return "skip";
};

/* -------------------------------------------------------------------------- */
/*                                 Remote setup                               */
/* -------------------------------------------------------------------------- */

/** Asks for a URL, adds it as origin and checks access. Returns null if the user skipped. */
const setUpOrigin = async (): Promise<string | null> => {
  console.log(chalk.yellow("\nThis repository has no remote yet, so there is nowhere to push."));

  for (;;) {
    const url = await askForRemoteUrl(
      `Paste the repository URL to add as "${DEFAULT_REMOTE}" (leave empty to skip pushing):`,
    );

    if (!url) {
      return null;
    }

    console.log(chalk.blue(`> git remote add ${DEFAULT_REMOTE} ${url}`));
    addRemote(DEFAULT_REMOTE, url);

    const access = await ensureRemoteAccess(DEFAULT_REMOTE);

    if (access === "ok") {
      return DEFAULT_REMOTE;
    }

    // Do not leave a remote behind that the user did not end up using.
    removeRemote(DEFAULT_REMOTE);

    if (access === "skip") {
      return null;
    }
  }
};

const changeRemoteUrl = async (remote: string) => {
  const url = await askForRemoteUrl(`New URL for "${remote}" (leave empty to skip pushing):`);

  if (!url) {
    return false;
  }

  console.log(chalk.blue(`> git remote set-url ${remote} ${url}`));
  setRemoteUrl(remote, url);
  return true;
};

/* -------------------------------------------------------------------------- */
/*                                    Push                                    */
/* -------------------------------------------------------------------------- */

const progressFlag = () => (process.stderr.isTTY ? ["--progress"] : []);

const pullRebase = async (remote: string, branchName: string) => {
  const args = ["pull", "--rebase", "--autostash", ...progressFlag(), remote, branchName];
  console.log(chalk.blue(`\n> git ${args.join(" ")}`));
  const result = await streamGit(withCredentials(args), { env: credentialEnv() });

  if (result.status === 0) {
    return;
  }

  if (isRebaseInProgress()) {
    abortRebase();
    throw new GitCommandError(
      `Your commits conflict with the commits on ${remote}/${branchName}, so git-aic undid the pull and left everything as it was. The commit is still in your local history.\nTo combine them yourself: git pull --rebase ${remote} ${branchName}, resolve the conflicts, run git rebase --continue, then git push.`,
      result.status,
      result.stderr,
    );
  }

  throw new GitCommandError(
    `git pull failed (exit ${result.status}): ${firstErrorLine(result.stderr)}. Your commit was created locally.`,
    result.status,
    result.stderr,
  );
};

/**
 * Pushes, and when it fails, explains why and offers the fix: signing in,
 * fixing the URL, or pulling the remote's newer commits first.
 */
const pushWithRecovery = async (
  buildArgs: () => string[],
  remote: string,
  branchName: string,
  options: PushOptions,
) => {
  for (let attempt = 0; attempt < MAX_RECOVERY_ATTEMPTS; attempt += 1) {
    const args = buildArgs();
    console.log(chalk.blue(`\n> git ${args.join(" ")}`));
    const result = await streamGit(withCredentials([...args.slice(0, 1), ...progressFlag(), ...args.slice(1)]), {
      env: credentialEnv(),
    });

    if (result.status === 0) {
      await offerToSaveCredentials(remote);
      return true;
    }

    const kind = classifyFailure(result.stderr);

    if (kind === "rejected") {
      console.log(
        chalk.yellow(
          `\n${remote}/${branchName} has commits that are not in your branch (for example a README created on the website).`,
        ),
      );

      if (!options.yes) {
        requireInteractive(
          "Deciding how to combine your branch with the remote",
          `Run: git pull --rebase ${remote} ${branchName} && git push  (or pass --yes to let git-aic do it).`,
        );
        const p = await loadPrompts();
        const pull = await p.confirm({
          message: `Pull those commits (git pull --rebase) and push again?`,
        });

        if (p.isCancel(pull) || !pull) {
          console.log(chalk.yellow("Push cancelled. The commit was created locally."));
          return false;
        }
      }

      await pullRebase(remote, branchName);
      continue;
    }

    if (kind === "auth" || kind === "not-found" || kind === "ssh" || kind === "network") {
      if (!isInteractive()) {
        throw new GitCommandError(
          `git push failed: ${firstErrorLine(result.stderr)}. The commit was created locally.`,
          result.status,
          result.stderr,
        );
      }

      const access = await ensureRemoteAccess(remote, result.stderr);

      if (access === "skip") {
        console.log(chalk.yellow("Push skipped. The commit was created locally."));
        return false;
      }

      if (access === "change-url" && !(await changeRemoteUrl(remote))) {
        console.log(chalk.yellow("Push skipped. The commit was created locally."));
        return false;
      }

      continue;
    }

    throw new GitCommandError(
      `git push failed (exit ${result.status}): ${firstErrorLine(result.stderr)}. The commit was created locally.`,
      result.status,
      result.stderr,
    );
  }

  throw new GitCommandError(
    "git push kept failing after several attempts. The commit was created locally.",
    null,
  );
};

/** Pushes the current branch, setting up a remote and upstream first when needed. */
export const pushCurrentBranch = async (branchName: string, options: PushOptions) => {
  if (!branchName) {
    console.log(chalk.yellow("\nHEAD is detached; skipping push. The commit was created locally."));
    return;
  }

  const upstream = getBranchUpstream();

  if (upstream) {
    const upstreamRemote = getConfiguredBranchRemote(branchName) || upstream.split("/")[0];

    if (await pushWithRecovery(() => ["push"], upstreamRemote, branchName, options)) {
      console.log(chalk.green("Push successful"));
    }

    return;
  }

  const remotes = getRemotes();
  let justAddedRemote = false;

  if (remotes.length === 0) {
    if (!isInteractive()) {
      console.log(
        chalk.yellow(
          "\nNo git remote is configured; skipping push. The commit was created locally.\nAdd one with: git remote add origin <url>",
        ),
      );
      return;
    }

    const added = await setUpOrigin();

    if (!added) {
      console.log(
        chalk.yellow("Push skipped. The commit was created locally.\nAdd a remote later with: git remote add origin <url>"),
      );
      return;
    }

    remotes.push(added);
    justAddedRemote = true;
  }

  const configured = getConfiguredBranchRemote(branchName);
  let remote =
    (configured && remotes.includes(configured) && configured) ||
    (remotes.length === 1 ? remotes[0] : remotes.includes(DEFAULT_REMOTE) ? DEFAULT_REMOTE : "");

  if (!remote) {
    requireInteractive("Choosing a remote to push to", `Set one with: git push --set-upstream <remote> ${branchName}`);
    const p = await loadPrompts();
    const choice = await p.select({
      message: `Branch "${branchName}" has no upstream. Which remote should it push to?`,
      options: remotes.map((name) => ({ value: name, label: name })),
    });

    if (p.isCancel(choice)) {
      console.log(chalk.yellow("Push cancelled. The commit was created locally."));
      return;
    }

    remote = choice;
  }

  // The user just typed the remote URL, so pushing to it needs no second confirmation.
  if (!options.yes && !justAddedRemote) {
    requireInteractive("Confirming the upstream branch", "Pass --yes to set it automatically.");
    const p = await loadPrompts();
    console.log(chalk.yellow(`\nBranch "${branchName}" has no upstream branch yet.`));
    const confirmed = await p.confirm({ message: `Set upstream to ${remote}/${branchName} and push now?` });

    if (p.isCancel(confirmed) || !confirmed) {
      throw new UserAbort("Push cancelled. The commit was created locally.");
    }
  }

  const target = remote;

  if (
    await pushWithRecovery(
      // After a pull, the upstream may now exist; --set-upstream is still correct either way.
      () => ["push", "--set-upstream", target, branchName],
      target,
      branchName,
      options,
    )
  ) {
    console.log(chalk.green(`Upstream set to ${target}/${branchName} and push successful.`));
  }
};
