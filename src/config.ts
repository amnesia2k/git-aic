import Conf from "conf";

export const API_KEY_ENV = "GEMINI_COMMIT_MESSAGE_API_KEY";
export const MODEL_ENV = "GIT_AIC_MODEL";
export const DEFAULT_MODEL = "gemini-2.5-flash";

interface ConfigSchema {
  apiKey?: string;
  model?: string;
  /** Ask whether to create a branch before committing on main/master. Off by default. */
  branchPrompt?: boolean;
}

// The key is stored as plain JSON; 0o600 keeps the file readable only by the
// current user on macOS/Linux (Windows ignores the mode).
export const config = new Conf<ConfigSchema>({
  projectName: "git-aic",
  configFileMode: 0o600,
});

export const getStoredApiKey = () => config.get("apiKey");
export const setStoredApiKey = (key: string) => config.set("apiKey", key);

export type SettingSource = "env" | "config" | "default" | "none";

export const resolveApiKey = (): { value: string; source: SettingSource } => {
  const fromEnv = process.env[API_KEY_ENV]?.trim();

  if (fromEnv) {
    return { value: fromEnv, source: "env" };
  }

  const stored = getStoredApiKey()?.trim();
  return stored
    ? { value: stored, source: "config" }
    : { value: "", source: "none" };
};

export const getStoredModel = () => config.get("model");
export const setStoredModel = (model: string) => config.set("model", model);
export const clearStoredModel = () => config.delete("model");

export const isValidModelName = (model: string) =>
  /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(model);

export const resolveModel = (): { value: string; source: SettingSource } => {
  const fromEnv = process.env[MODEL_ENV]?.trim();

  if (fromEnv) {
    return { value: fromEnv, source: "env" };
  }

  const stored = getStoredModel()?.trim();
  return stored
    ? { value: stored, source: "config" }
    : { value: DEFAULT_MODEL, source: "default" };
};

export const isBranchPromptEnabled = () => config.get("branchPrompt") === true;
export const setBranchPromptEnabled = (enabled: boolean) =>
  config.set("branchPrompt", enabled);
