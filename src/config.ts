import Conf from "conf";

// @ts-ignore
export const config = new Conf({ projectName: "git-aic" });

export const getStoredApiKey = () => config.get("apiKey") as string | undefined;
export const setStoredApiKey = (key: string) => config.set("apiKey", key);
