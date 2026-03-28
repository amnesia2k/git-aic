# Git AIC: AI-Powered Conventional Commits

Git AIC is a TypeScript CLI for two related workflows inside a Git repository:

- generating AI-assisted conventional commit messages from staged changes
- generating AI-explained markdown diff reports from selected working-tree changes

It is built for local Git usage with interactive file selection, Gemini-based summarization, and a low-friction terminal UX.

## What It Does

### Commit flow

`git aic`

- inspects the repository for changed files
- stages current changes, including deleted files, for commit workflows
- lets you choose which staged files should be part of the commit
- sends the staged diff to Gemini
- generates a Conventional Commits style message
- commits with that message

`git aic --push / git aic -p`

- runs the same commit flow
- pushes after a successful commit

### Diff report flow

`git aic --diff / git aic -d`

- inspects the repository for changed files
- lets you choose which files should be included in the report when there are multiple changed files
- does **not** stage or unstage files for the diff workflow
- reads the selected changes directly from the working tree
- generates a markdown report in `git-diffs/`
- explains each selected file diff with AI
- includes current repo metadata such as branch and base commit hash

## Key Behaviors

- **Conventional commit generation**: Commit messages are guided by strict prompt rules.
- **Single logical change stays one line**: If multiple files all belong to one logical change, the generated commit message stays a one-line summary.
- **Unrelated changes may become a list**: If the changes are clearly unrelated, the generated commit message may use a summary line plus bullet points.
- **Interactive file selection**: Multi-file changes open a selector so the user can choose the exact file set to commit, push, or document.
- **AI diff reports**: Diff reports explain the selected changes before showing the raw patch.
- **Structured diff naming**: Report filenames use a concise `type-topic.md` format such as `feat-auth-flow.md`.
- **Organized output**: Reports are written to `git-diffs/` in the current working directory.
- **Git ignore support**: On the first diff report run that creates `git-diffs/`, the tool adds `git-diffs/` to the current directory’s `.gitignore` if it is not already ignored.
- **Visible loading states**: Uses `cli-loaders` with the `arrows_3` loader and step-specific status messages.
- **Retry-safe AI requests**: Retries temporary Gemini rate limits and transient failures, then falls back cleanly if needed.

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

### 1. Global Installation (Standard)

The easiest way to use Git AIC is to install it globally via `npm` or `bun`:

```bash
npm install -g @amnesia2k/git-aic
# or
bun install -g @amnesia2k/git-aic
```

Once installed, you can skip the manual setup and use the built-in configuration commands:

- `git-aic set-key your_gemini_api_key_here`
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

## Configuration & API Key

Git AIC requires a Google Gemini API key.

### A. Persistent Configuration (Recommended)

You can securely store your API key in your user profile:

```bash
git-aic set-key your_gemini_api_key_here
```

To see your current configuration:

```bash
git-aic show
```

### B. Environment Variables (Manual)

Alternatively, you can set the `GEMINI_COMMIT_MESSAGE_API_KEY` variable.

**Windows PowerShell:**

```bash
setx GEMINI_COMMIT_MESSAGE_API_KEY "your_gemini_api_key_here"
```

**MacOS & Linux:**

```bash
export GEMINI_COMMIT_MESSAGE_API_KEY=your_gemini_api_key_here
```

Restart the terminal after setting the variable.

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

### 2. Commands

**Generate and create a commit:**

```bash
git aic
```

**Generate, commit, and push:**

```bash
git aic --push
```

**Generate a markdown diff report:**

```bash
git aic --diff
```

**Show current configuration:**

```bash
git aic show
```

**Display help:**

```bash
git aic help
```

> [!TIP]
> Use `git aic help` or `git aic -h` to see the help menu. Git reserves `--help` for its own internal documentation search, which causes raw `--help` to fail on custom aliases.

**Also supported:**

```bash
git aic -d : This is a shortcut for `git aic --diff`
git aic -p : This is a shortcut for `git aic --push`
```

## Important Workflow Notes

### Commit mode stages changes, then lets you choose

Commit workflows are based on the staged diff.

When you run `git aic` or `git aic --push`:

- the tool stages current changes, including deletions
- the tool prompts you to choose which files should stay staged for the commit
- files you do not select are unstaged before the commit is generated
- the final commit message is generated from the resulting staged diff

### Diff mode does not stage files

Diff report workflows are based on the selected changes directly.

When you select files for `-d` / `--diff`:

- the tool does not stage files
- the tool does not unstage files
- the tool reads the selected diffs and generates the markdown report from them

This keeps the report flow non-destructive and avoids changing index state unnecessarily.

## Example Output Location

Example generated report paths:

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
| ![ts-node](https://img.shields.io/badge/ts--node-3178C6?style=for-the-badge&logo=typescript&logoColor=white)        | Supports direct TypeScript execution in the project scripts.    |

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
