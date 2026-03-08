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

3. MESSAGE STRUCTURE:
   - The first line must be the summary: type(scope/${branchName || "unknown"}): description
   - If there are multiple distinct changes, you MUST add a blank line after the summary, followed by a bulleted list of details.
   - Example 1 (Single change): "feat(auth/${branchName || "unknown"}): add password reset functionality"
   - Example 2 (Multiple changes):
feat(api/${branchName || "unknown"}): update user endpoints

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
