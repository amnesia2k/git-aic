#!/usr/bin/env ts-node

import { Command } from "commander";
import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";
import chalk from "chalk";
import { getGitDiff, getBranchName } from "../src/git";
import { generateCommitMessage } from "../src/llm";

const git: SimpleGit = simpleGit();
const program = new Command();

program
  .name("commit")
  .description("AI-powered Git commit using Google Gemini")
  .version("1.0.0")
  .option("-p, --push", "push after committing");

program.action(async (options) => {
  try {
    const diff = await getGitDiff();

    if (!diff) {
      console.log(chalk.yellow("No staged changes found."));
      console.log(chalk.cyan("Fetching unstaged changes..."));

      const status = await git.status();

      // Automatically stage deleted files
      if (status.deleted.length > 0) {
        console.log(chalk.cyan(`Auto-staging ${status.deleted.length} deleted file(s)...`));
        await git.add(status.deleted);
      }

      const uncommittedFiles = [
        ...status.modified,
        ...status.not_added,
        ...status.created,
      ];

      // Remove duplicates
      const uniqueFiles = Array.from(new Set(uncommittedFiles));

      if (uniqueFiles.length === 0) {
        // If there were only deleted files, we might be good to go now!
        const postStageDiff = await getGitDiff();
        if (postStageDiff) {
            console.log(chalk.green("Auto-staged deleted files successfully."));
        } else {
            console.log(chalk.yellow("No files changed in this repository."));
            process.exit(0);
        }
      } else {
        console.log();
        const p = await import("@clack/prompts");
        
        p.intro(chalk.bgCyan(chalk.black(' Git AIC ')));

        const selectedFiles = await p.multiselect({
          message:
            "Select the files you want to stage and commit (Space to select, Enter to continue, Arrows to scroll):",
          options: uniqueFiles.map((file) => ({ value: file, label: file })),
          required: false,
        });

        if (p.isCancel(selectedFiles) || !selectedFiles || (selectedFiles as string[]).length === 0) {
            // Check if deleted files were staged
            const postStageDiff = await getGitDiff();
            if(!postStageDiff) {
              p.outro(chalk.yellow("No files selected. Exiting."));
              process.exit(0);
            }
        } else {
            const filesToStage = selectedFiles as string[];
            p.outro(chalk.blue(`Staging ${filesToStage.length} file(s)...`));
            await git.add(filesToStage);
        }
      }
    }

    // Re-check diff after potential staging
    const finalDiff = await getGitDiff();
    if (!finalDiff) {
      console.log(chalk.yellow("Still no changes to commit!"));
      process.exit(0);
    }

    const status = await git.status();
    console.log(chalk.blue("\nFiles being committed:"));
    status.staged.forEach((file) => console.log(chalk.cyan(`- ${file}`)));
    console.log("");

    console.log(chalk.blue("Analyzing staged changes...\n"));
    const branchName = await getBranchName();
    const message = await generateCommitMessage(finalDiff, branchName);

    console.log(chalk.green("Commit message generated:\n"));
    console.log(chalk.green(`"${message}"\n`));

    console.log(chalk.blue(`> ran: git commit -m\n"${message}"`));
    await git.commit(message);
    console.log(chalk.green("\nCommit successful"));

    if (options.push) {
      console.log(chalk.blue("> ran: git push"));
      await git.push();
      console.log(chalk.green("Push successful"));
    }
  } catch (error: any) {
    if (
      error.name === "ExitPromptError" ||
      error.message?.includes("force closed") ||
      error.message?.includes("Prompt was canceled")
    ) {
      console.log(chalk.yellow("\nCommit cancelled."));
      process.exit(0);
    }
    console.error(chalk.red("Commit failed:"), error);
    process.exit(1);
  }
});

program.parse(process.argv);
