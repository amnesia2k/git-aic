export const buildPrompt = (diff: string, branchName: string): string =>
  `
CRITICAL INSTRUCTIONS - READ CAREFULLY:
You are an expert Git commit message writer. You MUST follow ALL these rules:

1. FORMAT: Use Conventional Commits format: <type>(<scope>/<branch_name>): <description>
   - type: MUST be one of: feat, fix, refactor, chore, docs, style, test, perf, bugfix
   - scope: Should be the module/file affected (e.g., "auth", "api", "ui", "config", "feature")
   - branch_name: The current Git branch you are on. It is "${branchName || "unknown"}"
   - description: Clear, imperative description in present tense

2. DESCRIPTION REQUIREMENTS:
   - Start with an imperative verb (add, fix, remove, update, refactor, etc.)
   - Be specific about what changed
   - Keep the first line (the summary) under 72 characters total
   - NO trailing punctuation on the summary line
   - NO emojis ever
   - MUST be a complete sentence
   - Group related file changes together. If you change a service, controller, and route for the same feature (e.g. "auth"), summarize the collective change in just ONE line.
   - Do NOT list every file that changed.

3. MESSAGE STRUCTURE:
   - The first line must be the summary: type(scope/${branchName || "unknown"}): description
   - If there is ONLY ONE logical feature/fix being made (even if across multiple files), the commit message MUST BE EXACTLY ONE LINE. Do not use bullet points.
   - ONLY if there are entirely UNRELATED distinct features changed at once, you may add a blank line after the summary, followed by a bulleted list summarizing those distinct features.
   - Example 1 (Single logical change spanning multiple files): "feat(auth/${branchName || "unknown"}): implement jwt authentication flow"
   - Example 2 (Unrelated distinct changes):
feat(core/${branchName || "unknown"}): update foundational systems

- handle null response in user endpoint
- add rate limiting to requests

4. QUALITY CHECKS - YOUR OUTPUT MUST PASS:
   - Contains opening and closing parentheses
   - Has a colon after the parentheses
   - Description exists and is not empty
   - Summary line total length ≤ 72 characters
   - No markdown formatting
   - No code blocks
   - No explanations or notes

5. FAILURE MODE:
   - If you cannot generate a proper message, return exactly: "chore: update code"

YOUR TASK:
Analyze this git diff and generate exactly ONE proper commit message following all rules above.

Git diff:
${diff}

Commit message:
`.trim();

export const buildDiffExplanationPrompt = (
  filePath: string,
  diff: string,
  branchName: string,
): string =>
  `
You are explaining a staged git diff to a developer.

Rules:
- Explain only the changes shown for this file
- Write 2 to 4 short sentences
- Be concrete and precise
- Focus on what changed and why it matters
- No markdown headings
- No bullet points
- No code fences
- Do not restate the entire diff line by line
- The current branch is "${branchName || "unknown"}"

File:
${filePath}

Diff:
${diff}

Explanation:
`.trim();

export const buildBatchDiffExplanationsPrompt = (
  fileDiffs: Array<{ filePath: string; diff: string }>,
  branchName: string,
): string =>
  `
You are explaining staged git diffs to a developer.

Rules:
- Write exactly one explanation block for each file shown below
- Keep each explanation to 2 to 4 short sentences
- Be concrete and precise
- Focus on what changed and why it matters
- No markdown headings
- No bullet points
- No code fences
- Do not restate the diff line by line
- Use the exact file path provided
- Return blocks in this exact format:
FILE: <exact file path>
EXPLANATION: <plain text explanation>
END_FILE
- Return nothing except these blocks
- The current branch is "${branchName || "unknown"}"

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

export const buildDiffFileNamePrompt = (
  diff: string,
): string =>
  `
Classify these staged changes and produce a concise structured filename basis.

Rules:
- Return exactly two lines and nothing else
- First line format: type: <value>
- Second line format: topic: <value>
- type must be one of: feat, fix, refactor, chore, docs, style, test, perf, bugfix
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
