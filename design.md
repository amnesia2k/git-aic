# Git AIC Website Design Breakdown

This document provides a structured breakdown of the **Git AIC** CLI tool to guide the design and development of its official website.

---

## 1. Hero Section

- **Primary Headline**: AI-Powered Conventional Commits & Diff Explanations.
- **Supporting Headline**: A high-performance TypeScript CLI that turns your staged changes into perfectly formatted conventional commits and AI-explained markdown reports.
- **Primary Call to Action (CTA)**: `npm install -g @amnesia2k/git-aic` (Global installation).
- **Secondary Call to Action**: [View on GitHub](https://github.com/amnesia2k/git-aic) (For local development).
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

### Path A: Global NPM (Fastest)

1.  **Install**: `npm install -g @amnesia2k/git-aic`
2.  **Config**: `git aic set-key your_key_here`
3.  **Alias**: `git aic alias`
4.  **Run**: `git aic`

### Path B: Local Clone (Development)

1.  **Clone**: `git clone https://github.com/amnesia2k/git-aic.git`
2.  **Install**: `cd git-aic && bun install`
3.  **Config**: Set `GEMINI_COMMIT_MESSAGE_API_KEY` environment variable.
4.  **Alias**:
    - **Windows**: `git config --global alias.aic '!npx tsx "C:/path/to/git-aic/bin/cli.ts"'`
    - **macOS/Linux**: `git config --global alias.aic '!npx tsx "/path/to/git-aic/bin/cli.ts"'`

---

## 7. Design Aesthetics (Website Style Guide)

- **Aesthetic Direction**: Liquid-Glass + Black Terminal.
- **Theme**: Ultra-Dark Mode with high-contrast glassmorphism.
- **Typography**: Precision Monospace (e.g., JetBrains Mono) for code blocks; Modern Sans-Serif (e.g., Inter) for UI text.
- **Visual Elements**:
  - Blurred, translucent "glass" overlays for UI components to create depth.
  - Deep black obsidian backgrounds for terminal sections to maintain a code-centric focus.
  - Fluid, "liquid" animated gradients for background depth to add dynamic energy.
- **Animations**: Silky smooth transitions, subtle glass refraction effects, and authentic terminal typing animations for a premium developer experience.
