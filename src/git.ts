import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";

const git: SimpleGit = simpleGit();

export interface StagedFileDiff {
  filePath: string;
  diff: string;
}

export interface HeadCommitInfo {
  short: string;
  full: string;
}

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

export const getStagedFileDiffs = async (): Promise<StagedFileDiff[]> => {
  try {
    const status = await git.status();
    const fileDiffs = await Promise.all(
      status.staged.map(async (filePath) => {
        const diff = await git.diff([
          "--cached",
          "--ignore-space-at-eol",
          "--",
          filePath,
        ]);

        return {
          filePath,
          diff: diff || "",
        };
      }),
    );

    return fileDiffs.filter((entry) => entry.diff.trim().length > 0);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getHeadCommitInfo = async (): Promise<HeadCommitInfo> => {
  try {
    const full = (await git.revparse(["HEAD"])).trim();
    const short = (await git.revparse(["--short", "HEAD"])).trim();

    return {
      short,
      full,
    };
  } catch (error) {
    console.error(error);
    return {
      short: "unknown",
      full: "unknown",
    };
  }
};
