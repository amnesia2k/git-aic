import chalk from "chalk";
import { appendFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  getCollapsedUntrackedEntries,
  getFileLabel,
  getRepoRoot,
  type ChangedFile,
} from "./git.js";
import { UserAbort, isInteractive, loadPrompts } from "./ui.js";

/* -------------------------------------------------------------------------- */
/*                           .gitignore suggestions                           */
/* -------------------------------------------------------------------------- */

interface IgnoreRule {
  test: (name: string, isDirectory: boolean) => boolean;
  /** The .gitignore line for an untracked entry at `path`. */
  pattern: (name: string, path: string) => string;
  reason: string;
}

const anyWhere = (name: string, isDirectory = true) => (isDirectory ? `${name}/` : name);
const anchored = (_: string, path: string) => `/${path}`;
const named = (names: string[], reason: string): IgnoreRule => ({
  test: (name, isDirectory) => isDirectory && names.includes(name),
  pattern: (name) => anyWhere(name),
  reason,
});

const IGNORE_RULES: IgnoreRule[] = [
  named(["node_modules", "bower_components", ".pnpm-store", ".yarn-cache"], "installed dependencies"),
  named([".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox"], "Python environment / cache"),
  named([".next", ".nuxt", ".svelte-kit", ".turbo", ".parcel-cache", ".cache", ".vercel", ".netlify", ".wrangler", ".output", ".nitro", ".tanstack"], "framework build cache"),
  named([".gradle", ".terraform", ".dart_tool", ".expo"], "tool cache"),
  named(["coverage", ".nyc_output"], "test coverage output"),
  named([".idea"], "editor settings"),
  {
    test: (name, isDirectory) => isDirectory && ["dist", "build", "out", "target", "obj"].includes(name),
    pattern: anchored,
    reason: "build output",
  },
  {
    test: (name, isDirectory) =>
      !isDirectory && /^\.env(\..+)?$/.test(name) && !/\.(example|sample|template|dist|defaults)$/.test(name),
    pattern: (name) => name,
    reason: "environment file (often contains secrets)",
  },
  {
    test: (name, isDirectory) => !isDirectory && [".DS_Store", "Thumbs.db", "desktop.ini"].includes(name),
    pattern: (name) => name,
    reason: "operating system file",
  },
  {
    test: (name, isDirectory) => !isDirectory && /\.log$/.test(name),
    pattern: () => "*.log",
    reason: "log file",
  },
  {
    test: (name, isDirectory) => !isDirectory && /\.(pyc|tsbuildinfo)$/.test(name),
    pattern: (name) => `*${name.slice(name.lastIndexOf("."))}`,
    reason: "generated file",
  },
  {
    test: (name, isDirectory) => !isDirectory && name === ".eslintcache",
    pattern: (name) => name,
    reason: "tool cache",
  },
];

interface IgnoreSuggestion {
  pattern: string;
  entries: string[];
  reason: string;
}

const findIgnoreSuggestions = (): IgnoreSuggestion[] => {
  const byPattern = new Map<string, IgnoreSuggestion>();

  getCollapsedUntrackedEntries().forEach((entry) => {
    const isDirectory = entry.endsWith("/");
    const trimmed = entry.replace(/\/$/, "");
    const name = trimmed.slice(trimmed.lastIndexOf("/") + 1);
    const rule = IGNORE_RULES.find((candidate) => candidate.test(name, isDirectory));

    if (!rule) {
      return;
    }

    const pattern = rule.pattern(name, entry);
    const existing = byPattern.get(pattern);

    if (existing) {
      existing.entries.push(entry);
    } else {
      byPattern.set(pattern, { pattern, entries: [entry], reason: rule.reason });
    }
  });

  return [...byPattern.values()];
};

const appendToGitignore = (patterns: string[]) => {
  const path = join(getRepoRoot(), ".gitignore");
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const separator = current.length === 0 ? "" : current.endsWith("\n") ? "\n" : "\n\n";
  appendFileSync(path, `${separator}# Added by git-aic\n${patterns.join("\n")}\n`, "utf8");
};

const describeEntries = (entries: string[]) =>
  entries.length <= 2 ? entries.join(", ") : `${entries.slice(0, 2).join(", ")} +${entries.length - 2} more`;

/**
 * Looks for untracked dependency folders, build output, caches and env files
 * that are not ignored yet, and offers to add them to .gitignore. Anything the
 * user does not want ignored is left alone. Without a terminal (or with --yes)
 * nothing is written; the matches are left out of this run instead.
 *
 * Returns path prefixes to leave out of this run.
 */
export const suggestGitignoreEntries = async (options: { yes?: boolean }): Promise<string[]> => {
  const suggestions = findIgnoreSuggestions();

  if (suggestions.length === 0) {
    return [];
  }

  if (!isInteractive() || options.yes) {
    console.log(chalk.yellow("\nLeaving these out of this run (they look like files that should not be committed):"));
    suggestions.forEach((suggestion) =>
      console.log(chalk.gray(`  - ${describeEntries(suggestion.entries)}  (${suggestion.reason})`)),
    );
    console.log(chalk.gray("Run git aic in a terminal to add them to .gitignore.\n"));
    return suggestions.flatMap((suggestion) => suggestion.entries);
  }

  const p = await loadPrompts();
  console.log(
    chalk.yellow(
      `\nThese look like files that usually should not be committed or sent to Gemini, and ${existsSync(join(getRepoRoot(), ".gitignore")) ? "your .gitignore does not cover them" : "this repository has no .gitignore yet"}.`,
    ),
  );

  const selected = await p.multiselect<string>({
    message: "Add them to .gitignore? (uncheck any you do want to commit)",
    options: suggestions.map((suggestion) => ({
      value: suggestion.pattern,
      label: suggestion.pattern,
      hint: `${suggestion.reason}: ${describeEntries(suggestion.entries)}`,
    })),
    initialValues: suggestions.map((suggestion) => suggestion.pattern),
    required: false,
  });

  if (p.isCancel(selected)) {
    throw new UserAbort("Cancelled. Nothing was changed.");
  }

  if (selected.length > 0) {
    appendToGitignore(selected);
    console.log(chalk.green(`Added ${selected.length} pattern(s) to .gitignore.\n`));
  }

  return [];
};

export const isExcludedByPrefix = (file: ChangedFile, prefixes: string[]) =>
  prefixes.some((prefix) =>
    prefix.endsWith("/") ? file.path.startsWith(prefix) : file.path === prefix,
  );

/* -------------------------------------------------------------------------- */
/*                              Secret detection                              */
/* -------------------------------------------------------------------------- */

const SECRET_FILE_RULES: Array<{ pattern: RegExp; reason: string; unless?: RegExp }> = [
  { pattern: /(^|\/)\.env(\.[^/]+)?$/, unless: /\.(example|sample|template|dist|defaults)$/, reason: "environment file" },
  { pattern: /\.(pem|key|p12|pfx|jks|keystore|ppk)$/i, reason: "private key or certificate store" },
  { pattern: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/, reason: "SSH private key" },
  { pattern: /(^|\/)\.(npmrc|pypirc|netrc|git-credentials)$/, reason: "credentials file" },
  { pattern: /(^|\/)credentials(\.json)?$/i, reason: "credentials file" },
  { pattern: /service[-_]?account[^/]*\.json$/i, reason: "cloud service account key" },
  { pattern: /\.tfstate(\.backup)?$/, reason: "Terraform state (contains secrets)" },
];

const SECRET_CONTENT_RULES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/, reason: "private key" },
  { pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, reason: "AWS access key" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}/, reason: "GitHub token" },
  { pattern: /\bglpat-[A-Za-z0-9_-]{20,}/, reason: "GitLab token" },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, reason: "Google API key" },
  { pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}/, reason: "Slack token" },
  { pattern: /\b[rs]k_live_[0-9A-Za-z]{20,}/, reason: "Stripe live key" },
  { pattern: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}/, reason: "AI provider API key" },
  { pattern: /\bnpm_[A-Za-z0-9]{36}\b/, reason: "npm token" },
];

export interface SecretRisk {
  file: ChangedFile;
  reasons: string[];
}

export const findSecretRisks = (
  files: ChangedFile[],
  getDiff: (file: ChangedFile) => string,
): SecretRisk[] =>
  files
    .filter((file) => !file.deleted)
    .map((file) => {
      const reasons = new Set<string>();

      SECRET_FILE_RULES.forEach((rule) => {
        if (rule.pattern.test(file.path) && !rule.unless?.test(file.path)) {
          reasons.add(rule.reason);
        }
      });

      const addedLines = getDiff(file)
        .split(/\r?\n/)
        .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
        .join("\n");

      SECRET_CONTENT_RULES.forEach((rule) => {
        if (rule.pattern.test(addedLines)) {
          reasons.add(`possible ${rule.reason}`);
        }
      });

      return { file, reasons: [...reasons] };
    })
    .filter((risk) => risk.reasons.length > 0);

/**
 * Warns about files that look like they contain secrets. Returns the files to
 * leave out. Without a terminal (or with --yes) they are always left out.
 */
export const confirmSecretRisks = async (
  risks: SecretRisk[],
  action: "commit" | "report",
  options: { yes?: boolean },
): Promise<ChangedFile[]> => {
  if (risks.length === 0) {
    return [];
  }

  const consequence =
    action === "commit"
      ? "committed to your history and sent to Gemini"
      : "sent to Gemini and written into the report";

  console.log(chalk.red(`\nThese files look like they contain secrets. They would be ${consequence}:`));
  risks.forEach((risk) =>
    console.log(chalk.red(`  - ${getFileLabel(risk.file)}`) + chalk.gray(`  (${risk.reasons.join("; ")})`)),
  );

  if (!isInteractive() || options.yes) {
    console.log(chalk.yellow("Leaving them out. Run git aic in a terminal to include them on purpose.\n"));
    return risks.map((risk) => risk.file);
  }

  const p = await loadPrompts();
  const choice = await p.select({
    message: "What do you want to do?",
    options: [
      { value: "exclude", label: "Leave them out", hint: "recommended" },
      { value: "include", label: "Include them anyway", hint: "only if they contain no real secrets" },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (p.isCancel(choice) || choice === "cancel") {
    throw new UserAbort("Cancelled. Nothing was changed.");
  }

  return choice === "exclude" ? risks.map((risk) => risk.file) : [];
};
