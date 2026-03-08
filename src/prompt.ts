export const buildPrompt = (diff: string, branchName: string): string =>
  `
CRITICAL INSTRUCTIONS - READ CAREFULLY:
You are an expert Git commit message writer. You MUST follow ALL these rules:

1. FORMAT: Use Conventional Commits format: <type>(<scope>/<branch_name>): <description>
   - type: MUST be one of: feat, fix, refactor, chore, docs, style, test, perf
   - scope: Should be the module/file affected (e.g., "auth", "api", "ui", "config")
   - branch_name: The current Git branch you are on. It is "${branchName || "unknown"}"
   - description: Clear, imperative description in present tense

2. DESCRIPTION REQUIREMENTS:
   - Start with an imperative verb (add, fix, remove, update, refactor, etc.)
   - Be specific about what changed
   - Keep it under 72 characters total (including type and scope)
   - NO trailing punctuation
   - NO emojis ever
   - MUST be a complete sentence

3. MESSAGE STRUCTURE:
   - The entire commit message must be exactly one line
   - Format: type(scope/${branchName || "unknown"}): description
   - Example: "feat(auth/${branchName || "unknown"}): add password reset functionality"
   - Example: "fix(api/${branchName || "unknown"}): handle null response in user endpoint"
   - Example: "refactor(ui/${branchName || "unknown"}): simplify component state management"

4. QUALITY CHECKS - YOUR OUTPUT MUST PASS:
   - Contains opening and closing parentheses
   - Has a colon after the parentheses
   - Description exists and is not empty
   - Total length ≤ 72 characters
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
