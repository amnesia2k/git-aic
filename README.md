# Git AIC: AI-Powered Conventional Commits

Git AIC is a TypeScript CLI for two related workflows inside a Git repository:

- generating AI-assisted conventional commit messages from staged changes
- generating AI-explained markdown diff reports from selected working-tree changes

It is built for local Git usage with interactive file selection, Gemini-based summarization, and a low-friction terminal UX.

## What It Does

### Commit flow

`git aic`

- inspects the repository for changed files (works from any subdirectory)
- auto-stages deleted files and excludes them from the selection list
- shows the remaining local changes and lets you choose which ones to stage
- stages only the files you selected, then generates the commit from that staged set
- sends the staged diff to Gemini (lockfiles and generated files are summarized, oversized diffs are truncated)
- generates a Conventional Commits style message
- shows you the message and lets you **commit**, **edit** it in your Git editor, **regenerate** it, or **cancel**

First run in a new folder? Git AIC walks you through the setup instead of failing:

- not a Git repository yet: offers to run `git init`
- no Gemini API key yet: asks for it and saves it
- Git does not know your name and email: asks for them (for all repositories or just this one)
- dependency folders, build output, caches or `.env` files that are not ignored: offers to add them to `.gitignore` (uncheck anything you do want to commit)
- an empty repository: tells you to add files first

Safety checks before anything is committed or sent to Gemini:

- files that look like secrets (`.env`, private keys, credential files) or contain what looks like an API key or token are flagged, and you choose to leave them out (the default) or include them
- without a terminal, or with `--yes`, those files and the un-ignored folders above are always left out of the run

If there are no new changes but you have commits that are not pushed yet, `git aic` offers to push them (`git aic -p` pushes them straight away). No API key is needed for that.

Optional: `git-aic set-branch-prompt on` makes `git aic` ask whether to create a new branch when you are about to commit on `main` or `master` (off by default).

If anything stops the commit (you cancel, the AI request fails, a commit hook rejects it, or you press Ctrl+C), your previous staging area is restored exactly as it was.

`git aic --push / git aic -p`

- runs the same commit flow
- pushes after a successful commit
- if the branch has no upstream, offers to set one (using the branch's configured remote, the only remote, or `origin`)
- if the repository has no remote yet, asks for the repository URL, adds it as `origin`, checks it is reachable, then sets the upstream and pushes
- if the remote already has commits you do not have (for example a README created on GitHub), offers to run `git pull --rebase` and push again; if that would cause conflicts it is undone and you are told how to finish it yourself
- skips the push with a clear message when HEAD is detached

#### Private repositories and signing in

Git AIC lets you sign in instead of failing when a push needs credentials:

- **Credential manager first**: if you have one (Git Credential Manager is installed with Git for Windows, macOS has the Keychain helper), its normal sign-in window or browser login opens, and it remembers the login for next time.
- **Or type them in**: if there is no credential manager, or signing in through it does not work, Git AIC asks for your username and a personal access token (GitHub and GitLab no longer accept account passwords for Git; the prompt links to where you create a token). Typed credentials are only kept in memory for that one push and are never written to disk or put on the command line. After a successful push you can choose to save them in your credential manager.
- **"Repository not found"** on GitHub usually means you are signed in with an account that cannot see the private repository, so the first option is to sign in with a different account.
- **SSH remotes**: if your SSH key is not accepted, you can connect interactively (so SSH can ask to trust the host or for your key passphrase), or switch the remote to its HTTPS URL and sign in instead.
- **Wrong URL or network problems**: you can enter a different URL, try again, or skip the push. The commit always stays in your local history.

### Diff report flow

`git aic --diff / git aic -d`

- inspects the repository for changed files
- lets you choose which files should be included in the report when there are multiple changed files
- does **not** stage or unstage files for the diff workflow
- compares the working tree with the last commit (staged, unstaged, untracked, deleted, and renamed files; repositories without commits are supported)
- generates a markdown report in `git-diffs/` at the repository root
- explains each selected file diff with AI
- includes current repo metadata such as branch and base commit hash

## Key Behaviors

- **Review before commit**: Every generated message is shown for confirmation. Use `--yes` to skip the review, or `--dry-run` to only print it.
- **No silent fallback commits**: If Gemini rejects the request (for example an invalid API key), the command fails and nothing is committed.
- **Conventional commit generation**: Messages are guided by strict prompt rules, cleaned of quotes/markdown, and validated before committing.
- **Single logical change stays one line**: If multiple files all belong to one logical change, the generated commit message stays a one-line summary.
- **Unrelated changes may become a list**: If the changes are clearly unrelated, the generated commit message may use a summary line plus bullet points.
- **Interactive file selection**: Multi-file changes open a selector so you can choose the exact file set to commit, push, or document. Use `--all` to skip it.
- **Partial staging is respected**: If a file already has staged hunks (for example from `git add -p`), only the staged part is committed.
- **AI diff reports**: Diff reports explain the selected changes before showing the raw patch.
- **Structured diff naming**: Report filenames use a concise `type-topic.md` format such as `feat-auth-flow.md`.
- **Reports stay out of commits**: `git-diffs/` is added to `.git/info/exclude` (a local, untracked ignore file) unless it is already ignored, so your `.gitignore` is never modified.
- **Visible loading states**: Uses `cli-loaders` with the `arrows_3` loader and step-specific status messages.
- **Retry-safe AI requests**: Rate limits, server errors, and timeouts are retried with backoff; each request times out after 90 seconds.

## Diff Report Contents

Each generated markdown report includes:

- report title
- metadata section
- generated timestamp
- current branch
- short base commit hash
- full base commit hash
- selected file list
- one section per file
- AI explanation above the raw diff block

## Installation

Requires Node.js 20 or newer.

### 1. Global Installation (Standard)

The easiest way to use Git AIC is to install it globally via `npm` or `bun`:

```bash
npm install -g @amnesia2k/git-aic
# or
bun install -g @amnesia2k/git-aic
```

Once installed, you can skip the manual setup and use the built-in configuration commands:

- `git-aic set-key`
- `git-aic alias`

### 2. Local Development (Clone)

For developers or users who want to run the tool from the source code:

1. Clone the repository:

```bash
git clone https://github.com/amnesia2k/git-aic.git
cd git-aic
```

2. Install dependencies:

```bash
bun install
```

3. (Optional) Link the package locally:

```bash
npm link
```

Useful scripts:

```bash
bun run typecheck   # type-check the CLI
bun run lint        # lint the CLI
bun run build       # compile to dist/
```

## Configuration & API Key

Git AIC requires a Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey)).

### A. Stored Configuration (Recommended)

Store the key in your git-aic user config:

```bash
git-aic set-key
```

You will be prompted for the key, which keeps it out of your shell history. `git-aic set-key <key>` also works.

The key is stored in plain text in the config file shown by `git-aic show`. On macOS and Linux the file is created readable only by your user.

To see your current configuration (masked key, where it comes from, model, and config path):

```bash
git-aic show
```

### B. Environment Variables (Manual)

Alternatively, you can set the `GEMINI_COMMIT_MESSAGE_API_KEY` variable. **It takes precedence over a stored key.**

**Windows PowerShell:**

```bash
setx GEMINI_COMMIT_MESSAGE_API_KEY "your_gemini_api_key_here"
```

**MacOS & Linux:**

```bash
export GEMINI_COMMIT_MESSAGE_API_KEY=your_gemini_api_key_here
```

Restart the terminal after setting the variable.

### C. Model

Git AIC uses `gemini-2.5-flash` by default. To use a different Gemini model:

```bash
git-aic set-model gemini-2.5-pro
git-aic set-model default   # back to gemini-2.5-flash
```

You can also set `GIT_AIC_MODEL` for a single shell session. It takes precedence over the stored setting.

## Usage

### 1. The "git aic" Alias

To use the tool as a native Git subcommand (`git aic`), you need to set up a Git alias.

#### Option A: Automatic Setup (Global NPM)

If you installed via NPM, run:

```bash
git-aic alias
```

#### Option B: Manual Setup (Local Clone)

If you are running from a local clone, point the alias to your entry point:

**Windows PowerShell:**

```bash
git config --global alias.aic '!npx tsx "C:/Users/YourName/path/to/git-aic/bin/cli.ts"'
```

**macOS / Linux:**

```bash
git config --global alias.aic '!npx tsx "/Users/YourName/path/to/git-aic/bin/cli.ts"'
```

### 2. Command Reference

```text
git aic [options]              generate a commit (or a diff report with -d)
git aic <command> [arguments]  configuration and setup commands
```

`git aic` and `git-aic` are the same program: `git aic` works once the alias is set up (`git-aic alias`), and `git-aic` always works.

> [!TIP]
> Use `git aic help` or `git aic -h` for the help menu. Git reserves `git aic --help` for its own manual pages, so it fails on aliases. `git-aic --help` (with the dash) works.

#### Options

| Option          | What it does                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------ |
| _(none)_        | Select files, generate a commit message, review it, and commit.                                  |
| `-p, --push`    | After committing, push the branch. Also pushes existing unpushed commits when nothing is new.    |
| `-d, --diff`    | Write a markdown report explaining the selected changes to `git-diffs/` instead of committing.    |
| `-a, --all`     | Use every changed file and skip the file selector (commit and diff mode).                        |
| `-y, --yes`     | Skip confirmations. See below for exactly what it changes.                                       |
| `--dry-run`     | Generate and print the commit message, then restore the staging area. Nothing is committed.      |
| `-V, --version` | Print the installed version.                                                                     |
| `-h, --help`    | Print help. `git aic help <command>` prints help for one command.                                |

What `--yes` changes:

- the generated message is committed without the Commit / Edit / Regenerate / Cancel review (it still has to be a valid Conventional Commit, or nothing is committed)
- when pushing a branch without an upstream, the upstream is set without asking
- when the remote has commits you do not have, `git pull --rebase` runs without asking
- files that look like secrets, and dependency/build/cache folders that are not ignored, are left out automatically (nothing is written to `.gitignore`)
- the optional branch prompt is skipped

`--yes` never skips questions whose answer only you can give (an API key, your Git name and email, a remote URL, credentials). Without a terminal those steps stop with instructions instead.

Option rules:

- `--push` and `--dry-run` cannot be combined with `--diff` (diff mode never commits)
- options combine freely otherwise, e.g. `git aic -a -y -p`
- the legacy spelling `-diff` is accepted as `--diff`

#### Commands

| Command                            | What it does                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `git-aic set-key [key]`            | Save your Gemini API key. Without `key` it asks for it, which keeps it out of your shell history. |
| `git-aic set-model <model>`        | Use another Gemini model, e.g. `gemini-2.5-pro`. `git-aic set-model default` goes back to `gemini-2.5-flash`. |
| `git-aic set-branch-prompt <on\|off>` | When `on`, offer to create a new branch before committing on `main`/`master`. Off by default.  |
| `git-aic show`                     | Show the masked API key and where it comes from, the model, the branch prompt setting, and the config file path. |
| `git-aic alias`                    | Create the global `git aic` alias (`git config --global alias.aic '!git-aic'`).                    |
| `git-aic help [command]`           | Show help for git-aic or for one command.                                                          |

#### Environment variables

| Variable                        | What it does                                                         |
| ------------------------------- | -------------------------------------------------------------------- |
| `GEMINI_COMMIT_MESSAGE_API_KEY` | Gemini API key. Takes precedence over the key saved with `set-key`.  |
| `GIT_AIC_MODEL`                 | Gemini model for this shell. Takes precedence over `set-model`.      |
| `GIT_AIC_DEBUG`                 | Set to `1` to print full error details (stack traces).               |

#### Common recipes

```bash
git aic                      # pick files, review the message, commit
git aic -p                   # same, then push (sets up origin and sign-in if needed)
git aic -a                   # commit every changed file, still review the message
git aic --dry-run            # preview the message; nothing is committed
git aic -d                   # write a diff report for the files you pick
git aic -d -a                # diff report for every changed file
git aic -a -y -p             # no prompts at all: commit everything and push (scripts/CI)
git aic -p                   # with nothing new to commit: push your unpushed commits
git-aic set-model gemini-2.5-pro
git aic help set-model
```

#### Exit codes

| Code  | Meaning                                                               |
| ----- | --------------------------------------------------------------------- |
| `0`   | Success, or you cancelled (nothing was changed)                       |
| `1`   | Error (the message explains what happened; nothing half-done is left) |
| `130` | Interrupted with Ctrl+C (your staging area is restored)               |

## Important Workflow Notes

### Commit mode auto-stages deletions, then stages your selection

Commit workflows are based on the staged diff.

When you run `git aic` or `git aic --push`:

- deleted files are staged automatically and are not shown in the selection list
- the tool lists the remaining local changes and prompts you to choose which ones to stage
- only the files you selected, plus the auto-staged deletions, remain staged for the commit
- files that already had staged changes keep exactly what was staged
- the final commit message is generated from the resulting staged diff
- if the commit does not happen, the staging area is put back the way it was

Repositories with unresolved merge conflicts are refused until the conflicts are resolved.

### Diff mode does not stage files

Diff report workflows are based on the selected changes directly.

When you select files for `-d` / `--diff`:

- the tool does not stage files
- the tool does not unstage files
- the tool reads the selected diffs and generates the markdown report from them

This keeps the report flow non-destructive and avoids changing index state unnecessarily.

### What is sent to Gemini

The diff of the selected changes is sent to the Gemini API. To keep requests small and relevant, lockfiles (`package-lock.json`, `bun.lock`, `yarn.lock`, `Cargo.lock`, ...) and generated files (`*.min.js`, `*.map`) are replaced by a one-line summary, each file's diff is capped at about 12,000 characters, and the whole prompt at about 120,000 characters. Don't use the tool on changes you are not allowed to share with Google.

## Example Output Location

Example generated report paths (relative to the repository root):

- `git-diffs/feat-auth-flow.md`
- `git-diffs/fix-config-loading.md`
- `git-diffs/refactor-cli-loader.md`

If a filename already exists, numeric suffixes are used:

- `feat-auth-flow.md`
- `feat-auth-flow-1.md`
- `feat-auth-flow-2.md`

<!-- ## Tech Stack

- TypeScript
- Node.js
- Commander.js
- Chalk
- `@clack/prompts`
- `simple-git`
- Axios
- Google Gemini
- `cli-loaders` -->

## Technologies Used

| Technology                                                                                                          | Description                                                     |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)   | Primary language for robust and scalable code.                  |
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)          | JavaScript runtime used to execute the CLI tool.                |
| ![Bun](https://img.shields.io/badge/Bun-000?style=for-the-badge&logo=bun&logoColor=fff)                             | Fast all-in-one JavaScript runtime.                             |
| ![Google Gemini](https://img.shields.io/badge/Google_Gemini-FF681A?style=for-the-badge&logo=google&logoColor=white) | Large Language Model for intelligent commit message generation. |
| ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)                  | Promise-based HTTP client for API requests.                     |
| ![simple-git](https://img.shields.io/badge/simple--git-E44C30?style=for-the-badge&logo=git&logoColor=white)         | Facilitates Git operations programmatically.                    |
| ![Clack Prompts](https://img.shields.io/badge/Clack_Prompts-A26DFD?style=for-the-badge&logo=npm&logoColor=white)    | Interactive command-line interface prompts.                     |
| ![cli-loaders](https://img.shields.io/badge/cli--loaders-111111?style=for-the-badge&logo=npm&logoColor=white)       | Provides animated terminal loaders for visible CLI progress.    |
| ![Chalk](https://img.shields.io/badge/Chalk-FFB601?style=for-the-badge&logo=npm&logoColor=white)                    | Terminal string styling for enhanced readability.               |
| ![Commander.js](https://img.shields.io/badge/Commander.js-F5F5F5?style=for-the-badge&logo=npm&logoColor=black)      | Framework for building robust command-line interfaces.          |
| ![tsx](https://img.shields.io/badge/tsx-3178C6?style=for-the-badge&logo=typescript&logoColor=white)                 | Runs the TypeScript CLI entrypoint directly during local usage. |

<!-- ## Contributing

We welcome contributions to Git AIC! If you have suggestions for improvements or new features, please feel free to contribute.

-- ✨ Fork the repository to your GitHub account.
-- 🛠️ Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`.
-- 💡 Implement your changes and ensure they align with the project's coding style.
-- 📝 Commit your changes with a descriptive, Conventional Commit-style message.
-- 🚀 Push your branch and open a pull request. -->

## License

This project is licensed under the [MIT License](LICENSE). See the file for details.

## Author Info

Developed by a passionate software engineer.

- **Olatilewa Olatoye**
- LinkedIn: [`[Olatilewa Olatoye]`](https://www.linkedin.com/in/olatilewaolatoye)
- X (formerly Twitter): [`[@olathedev_]`](https://x.com/olathedev_)

## Badges

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/en/)
[![NPM Version](https://img.shields.io/npm/v/@amnesia2k/git-aic?style=for-the-badge)](https://www.npmjs.com/package/@amnesia2k/git-aic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
