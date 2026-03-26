import { simpleGit } from "simple-git";
import type { SimpleGit } from "simple-git";
import { readFileSync } from "fs";

const git: SimpleGit = simpleGit();

export interface FileDiff {
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

export const getBranchUpstream = async () => {
  try {
    const upstream = await git.raw([
      "rev-parse",
      "--abbrev-ref",
      "--symbolic-full-name",
      "@{u}",
    ]);

    return upstream.trim();
  } catch (error) {
    return "";
  }
};

export const getStagedFileDiffs = async (): Promise<FileDiff[]> => {
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

const createUntrackedFileDiff = (filePath: string) => {
  try {
    const contents = readFileSync(filePath, "utf8");
    const lines = contents.split(/\r?\n/);
    const body = lines.map((line) => `+${line}`).join("\n");

    return [
      `diff --git a/${filePath} b/${filePath}`,
      "new file mode 100644",
      "index 0000000..0000000",
      "--- /dev/null",
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${lines.length} @@`,
      body,
    ].join("\n");
  } catch (error) {
    console.error(error);
    return "";
  }
};

export const getSelectedFileDiffs = async (
  filePaths: string[],
): Promise<FileDiff[]> => {
  try {
    const status = await git.status();
    const fileDiffs = await Promise.all(
      filePaths.map(async (filePath) => {
        if (status.not_added.includes(filePath)) {
          return {
            filePath,
            diff: createUntrackedFileDiff(filePath),
          };
        }

        const diff = await git.diff([
          "HEAD",
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

export const getSelectedFilesDiff = async (filePaths: string[]) => {
  const fileDiffs = await getSelectedFileDiffs(filePaths);
  return fileDiffs.map(({ diff }) => diff).join("\n\n");
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
