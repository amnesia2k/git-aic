# Git AIC Website Design Breakdown

This document provides a structured breakdown of the **Git AIC** CLI tool to guide the design and development of its official website.

---

## 1. Hero Section

- **Primary Headline**: AI-Powered Conventional Commits & Diff Explanations.
- **Supporting Headline**: A high-performance TypeScript CLI that turns your staged changes into perfectly formatted conventional commits and AI-explained markdown reports.
- **Primary Call to Action (CTA)**: `bun install -g git-aic` (or link to Installation section).
- **Secondary Call to Action**: [View on GitHub](https://github.com/amnesia2k/git-aic).
- **Key Visual (Hero Area)**: A sleek, dark-themed terminal mock-up showing an interactive file selection (`@clack/prompts`) followed by a generated commit message: `feat(api/main): implement user authentication flow`.

---

## 2. Value Proposition (The "Why")

- **Eliminate Writer's Block**: Never struggle to describe your changes again.
- **Standardize Your Commits**: Automatically enforced Conventional Commits format ensures a clean, readable project history.
- **Streamlined Code Reviews**: Generate "Diff Reports" that explain _what_ changed and _why_ it matters, before showing the raw code.
- **Low Friction**: Designed for speed with `bun` and a minimal terminal UX.

---

## 3. Core Workflows

### A. The Commit Flow (`git aic`)

- **Input**: Staged file changes.
- **Interactive**: Choose exactly which files to include if multiple are changed.
- **AI Engine**: Powered by Google Gemini to analyze diffs and branch context.
- **Outcome**: A staged, formatted commit message ready for the repo.
- **Power Move**: Use `--push` to commit and push in one single command.

### B. The Diff Report Flow (`git aic --diff`)

- **Input**: Selected working-tree changes.
- **Non-Destructive**: Does not stage/unstage files or alter your Git index.
- **AI Engine**: Generates concise, 2-4 sentence explanations for every file changed.
- **Outcome**: A professionally structured `.md` report in `git-diffs/` with metadata (branch, commit hash, timestamp).

---

## 4. Key Features

- **Smart Conventional Commits**: Uses strict rules to produce `type(scope): description` summaries.
- **Interactive File Selector**: Multi-select interface for granular control over what gets committed.
- **Retry-Safe AI Requests**: Built-in exponential backoff for Gemini API rate limits.
- **Auto-Staging**: Intelligently handles deleted files in commit workflows.
- **Structured Output**: Automatic naming convention for reports (`feat-auth-flow.md`) and automatic `.gitignore` management for the output folder.

---

## 5. Technology Stack

- **Runtime**: [Bun](https://bun.sh/) & [Node.js](https://nodejs.org/).
- **Language**: [TypeScript](https://www.typescriptlang.org/).
- **AI**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/).
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js).
- **UX/UI**: [@clack/prompts](https://github.com/natemoo-re/clack) & [Chalk](https://github.com/chalk/chalk).
- **Git Integration**: [simple-git](https://github.com/steveukx/git-js).

---

## 6. Installation & Quick Start

- **Step 1**: Clone repo & Install.
  ```bash
  git clone https://github.com/amnesia2k/git-aic.git
  cd git-aic && bun install
  ```
- **Step 2**: Set Gemini API Key.
  ```bash
  export GEMINI_COMMIT_MESSAGE_API_KEY=your_key_here
  ```
- **Step 3**: Create an Alias.
  ```bash
  git config --global alias.aic '!npx tsx /path/to/git-aic/bin/cli.ts'
  ```

---

## 7. Design Aesthetics (Website Style Guide)

- **Theme**: Dark Mode (Code-centric).
- **Colors**:
  - Primary: Gemini Cyan (`#00FFFF`).
  - Secondary: Terminal Green (`#00FF00`).
  - Background: Deep Slate (`#0B0E14`).
- **Typography**: Monospace (JetBrains Mono or Fira Code) for code samples; Inter for body text.
- **Animations**: Subtle "typing" effects for command examples and pulsing states for "AI Analysis".
