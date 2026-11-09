export const COMMIT_TYPES = [
  "feat",
  "fix",
  "refactor",
  "chore",
  "docs",
  "style",
  "test",
  "perf",
  "bugfix",
] as const;

const COMMIT_TYPE_LIST = COMMIT_TYPES.join(", ");

/** Branch names go inside the commit scope, so any separator other than "-" becomes "-". */
export const normalizeBranchNameForCommitMessage = (
  branchName: string,
): string =>
  branchName
    .trim()
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const buildPrompt = (diff: string, branchName: string): string => {
  const branch = normalizeBranchNameForCommitMessage(branchName);
  const scopeFormat = branch ? `<scope>/${branch}` : "<scope>";
  const scope = (name: string) => (branch ? `${name}/${branch}` : name);

  return `
CRITICAL INSTRUCTIONS - READ CAREFULLY:
You are an expert Git commit message writer. You MUST follow ALL these rules:

1. FORMAT: Use Conventional Commits format: <type>(${scopeFormat}): <description>
   - type: MUST be one of: ${COMMIT_TYPE_LIST}
   - scope: the module/area affected (e.g. "auth", "api", "ui", "config")
${
  branch
    ? `   - after the scope, include "/${branch}" exactly as written (the current branch, already normalized)`
    : "   - HEAD is detached, so do NOT include a branch name in the scope"
}
   - description: clear, imperative description in present tense

2. DESCRIPTION REQUIREMENTS:
   - Start with an imperative verb (add, fix, remove, update, refactor, etc.)
   - Be specific about what changed
   - Keep the description (the text after ": ") under 60 characters
   - NO trailing punctuation on the summary line
   - NO emojis ever
   - Group related file changes together. If a service, controller, and route change for the same feature, summarize the collective change in ONE line.
   - Do NOT list every file that changed.

3. MESSAGE STRUCTURE:
   - The first line must be the summary: <type>(${scopeFormat}): <description>
   - If there is ONLY ONE logical feature/fix (even across multiple files), the commit message MUST BE EXACTLY ONE LINE. Do not use bullet points.
   - ONLY if there are entirely UNRELATED changes, add a blank line after the summary followed by a bulleted list ("- ") summarizing them.
   - Example 1 (single logical change spanning multiple files): feat(${scope("auth")}): implement jwt authentication flow
   - Example 2 (unrelated changes):
feat(${scope("core")}): update foundational systems

- handle null response in user endpoint
- add rate limiting to requests

4. OUTPUT RULES:
   - Output ONLY the commit message
   - No surrounding quotes
   - No markdown formatting or code blocks
   - No explanations or notes
   - Some diffs may be truncated or summarized (lockfiles, generated files); describe the change from what is shown

YOUR TASK:
Analyze this git diff and generate exactly ONE commit message following all rules above.

Git diff:
${diff}

Commit message:
`.trim();
};

export const buildBatchDiffExplanationsPrompt = (
  fileDiffs: Array<{ filePath: string; diff: string }>,
  branchName: string,
): string =>
  `
You are explaining uncommitted git changes (working tree compared with the last commit) to a developer.

Rules:
- Write exactly one explanation block for each file shown below
- Keep each explanation to 2 to 4 short sentences
- Be concrete and precise
- Focus on what changed and why it matters
- No markdown headings
- No bullet points
- No code fences
- Do not restate the diff line by line
- Some diffs may be truncated or summarized; explain from what is shown
- Use the exact file path provided after "FILE:"
- Return blocks in this exact format:
FILE: <exact file path>
EXPLANATION: <plain text explanation>
END_FILE
- Return nothing except these blocks
- The current branch is "${branchName || "detached HEAD"}"

Files and diffs:
${fileDiffs
  .map(
    ({ filePath, diff }) => `
FILE: ${filePath}
DIFF:
${diff}
END_DIFF
`.trim(),
  )
  .join("\n\n")}

Result:
`.trim();

export const buildDiffFileNamePrompt = (diff: string): string =>
  `
Classify these uncommitted changes and produce a concise structured filename basis.

Rules:
- Return exactly two lines and nothing else
- First line format: type: <value>
- Second line format: topic: <value>
- type must be one of: ${COMMIT_TYPE_LIST}
- topic must be 1 to 3 lowercase hyphen-separated words
- topic must describe the actual change area
- Do not include branch names
- Do not include dates
- Do not include the .md extension
- Do not include quotes, markdown, bullets, or explanations
- Avoid generic filler words like proposed, report, diff, and changes unless absolutely necessary

Git diff:
${diff}

Result:
`.trim();
