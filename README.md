# Git AIC: AI-Powered Conventional Commits

Git AIC is a TypeScript CLI for two related workflows inside a Git repository:

- generating AI-assisted conventional commit messages from staged changes
- generating AI-explained markdown diff reports from selected working-tree changes

It is built for local Git usage with interactive file selection, Gemini-based summarization, and a low-friction terminal UX.

## What It Does

### Commit flow

`git aic`

- inspects the repository for changed files
- auto-stages deleted files for commit workflows
- lets you choose which files should be part of the commit when there are multiple changed files
- stages newly selected files and unstages deselected staged files
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

1. Clone the repository:

```bash
git clone https://github.com/amnesia2k/git-aic.git
cd git-aic
```

2. Install dependencies:

```bash
bun install
```

You can also use `npm`, `pnpm`, or `yarn` if that fits your environment.

## Environment Variable

Git AIC requires a Gemini API key.

Variable:

- `GEMINI_COMMIT_MESSAGE_API_KEY`

Example:

```bash
export GEMINI_COMMIT_MESSAGE_API_KEY=your_gemini_api_key_here
```

Windows PowerShell:

```powershell
setx GEMINI_COMMIT_MESSAGE_API_KEY "your_gemini_api_key_here"
```

Restart the terminal after setting the variable.

## Usage

### Git alias

Windows:

```bash
git config --global alias.aic '!npx tsx "C:/Users/YourName/path/to/git-aic/bin/cli.ts"'
```

macOS / Linux:

```bash
git config --global alias.aic '!npx tsx "/Users/YourName/path/to/git-aic/bin/cli.ts"'
```

### Commands

Generate and create a commit:

```bash
git aic
```

Generate, commit, and push:

```bash
git aic --push
```

Generate a markdown diff report:

```bash
git aic --diff
```

Also supported:

```bash
git aic -diff
git aic -d
git aic -p
```

## Important Workflow Notes

### Commit mode stages files

Commit workflows are based on the staged diff.

When you select files for commit mode:

- unselected staged files are unstaged
- selected unstaged files are staged
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
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)         | JavaScript runtime used to execute the CLI tool.                |
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

This project is licensed under the MIT License. See the `package.json` file for more details.

## Author Info

Developed by a passionate software engineer.

- **Olatilewa Olatoye**
- LinkedIn: [`[Olatilewa Olatoye]`](https://www.linkedin.com/in/olatilewaolatoye)
- X (formerly Twitter): [`[@olathedev_]`](https://x.com/olathedev_)

## Badges

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/en/)
[![NPM Version](https://img.shields.io/npm/v/git-aic?style=for-the-badge)](https://www.npmjs.com/package/git-aic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
