/**
 * Helpers that keep what is sent to the model small and relevant: lockfiles and
 * generated assets are summarised instead of sent in full, oversized file diffs
 * are truncated, and the whole prompt stays under a total character budget.
 */

export const MAX_FILE_DIFF_CHARS = 12_000;
export const MAX_TOTAL_DIFF_CHARS = 120_000;

const OMITTED_FILE_PATTERNS: RegExp[] = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)npm-shrinkwrap\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)bun\.lockb?$/,
  /(^|\/)deno\.lock$/,
  /(^|\/)Cargo\.lock$/,
  /(^|\/)Gemfile\.lock$/,
  /(^|\/)composer\.lock$/,
  /(^|\/)poetry\.lock$/,
  /(^|\/)Pipfile\.lock$/,
  /(^|\/)uv\.lock$/,
  /(^|\/)go\.sum$/,
  /(^|\/)flake\.lock$/,
  /\.min\.(js|css|mjs)$/,
  /\.map$/,
  /(^|\/)routeTree\.gen\.ts$/,
];

export const isOmittedFromPrompt = (filePath: string) =>
  OMITTED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));

const countChangedLines = (diff: string) => {
  let additions = 0;
  let deletions = 0;
  let inHunk = false;

  diff.split(/\r?\n/).forEach((line) => {
    if (line.startsWith("@@")) {
      inHunk = true;
      return;
    }

    if (line.startsWith("diff --git")) {
      inHunk = false;
      return;
    }

    if (!inHunk) {
      return;
    }

    if (line.startsWith("+")) {
      additions += 1;
    } else if (line.startsWith("-")) {
      deletions += 1;
    }
  });

  return { additions, deletions };
};

const getDiffPath = (chunk: string) => {
  const header = chunk.split(/\r?\n/, 1)[0] || "";
  const match = /^diff --git (?:"?a\/(.+?)"?) (?:"?b\/(.+?)"?)$/.exec(header);
  return match?.[2] || match?.[1] || "";
};

/** Shrinks a single file's diff for the prompt. */
export const prepareFileDiffForPrompt = (
  filePath: string,
  diff: string,
  maxChars = MAX_FILE_DIFF_CHARS,
) => {
  if (isOmittedFromPrompt(filePath)) {
    const header = diff.split(/\r?\n/, 1)[0] || `diff --git a/${filePath} b/${filePath}`;
    const { additions, deletions } = countChangedLines(diff);
    return `${header}\n[contents omitted: lockfile or generated file, +${additions}/-${deletions} lines]`;
  }

  if (diff.length <= maxChars) {
    return diff;
  }

  return `${diff.slice(0, maxChars)}\n[... diff truncated: ${diff.length - maxChars} more characters not shown]`;
};

/** Splits a multi-file diff and applies per-file and total size limits. */
export const prepareDiffForPrompt = (
  diff: string,
  maxTotalChars = MAX_TOTAL_DIFF_CHARS,
) => {
  const chunks = diff
    .split(/^(?=diff --git )/m)
    .filter((chunk) => chunk.trim().length > 0);

  if (chunks.length === 0) {
    return diff.length > maxTotalChars
      ? `${diff.slice(0, maxTotalChars)}\n[... truncated]`
      : diff;
  }

  const output: string[] = [];
  let total = 0;

  chunks.forEach((chunk) => {
    const filePath = getDiffPath(chunk);
    const prepared = prepareFileDiffForPrompt(filePath, chunk.trimEnd());

    if (total + prepared.length > maxTotalChars) {
      output.push(
        `diff --git a/${filePath} b/${filePath}\n[diff omitted: prompt size budget reached]`,
      );
      return;
    }

    total += prepared.length;
    output.push(prepared);
  });

  return output.join("\n");
};

/** A backtick fence longer than any backtick run inside the content. */
export const getMarkdownFence = (content: string) => {
  const longestRun = (content.match(/`+/g) || []).reduce(
    (max, run) => Math.max(max, run.length),
    0,
  );

  return "`".repeat(Math.max(3, longestRun + 1));
};
