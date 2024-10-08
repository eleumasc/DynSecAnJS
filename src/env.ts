import assert from "assert";
import path from "path";
import "dotenv/config";

const get = (key: string): string => {
  const value = process.env[key] as string | undefined;
  assert(
    typeof value === "string",
    `Missing required environment variable: ${key}`
  );
  return value;
};

const getFlag = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key] as string | undefined;
  switch (value) {
    case undefined:
      return defaultValue;
    case "0":
      return false;
    case "1":
      return true;
    default:
      throw new Error(
        `Flag must be 0 or 1 when environment variable is specified: ${key}`
      );
  }
};

export const debugMode = getFlag("DEBUG_MODE", false);
export const headless = !getFlag("HEADFUL_MODE", false);
export const toolsPath = path.resolve(get("TOOLS_PATH"));

export const wprgoPath = path.join(toolsPath, "web_page_replay_go");
export const jestPath = path.join(toolsPath, "jest");
export const ifTranspilerPath = path.join(toolsPath, "if-transpiler");
export const jalangiPath = path.join(toolsPath, "jalangi2");
export const gifcPath = path.join(toolsPath, "gifc");
export const linvailTaintPath = path.join(toolsPath, "linvail-taint");
export const projectFoxhoundPath = path.join(toolsPath, "foxhound");
export const panoptiChromePath = path.join(toolsPath, "panoptichrome");

export const localhost = "127.0.0.1";
