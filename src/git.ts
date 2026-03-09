import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";

const git: SimpleGit = simpleGit();

export const getGitDiff = async () => {
  try {
    await git.raw(["config", "core.autocrlf", "true"]);
    const diff = await git.diff(["--cached", "--ignore-space-at-eol"]);
    return diff || "";
  } catch (error) {
    console.error(error);
    return "";
  }
};

export const getBranchName = async () => {
  try {
    const status = await git.status();
    return status.current || "";
  } catch (error) {
    console.error(error);
    return "";
  }
};
