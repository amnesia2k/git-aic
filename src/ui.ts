import chalk from "chalk";

/** The user stopped the flow on purpose; not an error. */
export class UserAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAbort";
  }
}

/** Wrong usage or an unsupported repository state, explained to the user. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export const isInteractive = () =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY);

export const requireInteractive = (what: string, hint: string) => {
  if (!isInteractive()) {
    throw new UsageError(`${what} needs an interactive terminal. ${hint}`.trim());
  }
};

export const loadPrompts = () => import("@clack/prompts");

export const printIntro = async () => {
  const p = await loadPrompts();
  p.intro(chalk.bgCyan(chalk.black(" Git AIC ")));
};
