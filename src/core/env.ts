import "dotenv/config";

import assert from "assert";
import path from "path";

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
export const aranLinvailPath = path.join(toolsPath, "aran-linvail");
export const geckoDriverPath = toolsPath;
export const projectFoxhoundPath = path.join(toolsPath, "foxhound");
export const firefoxPath = path.join(toolsPath, "firefox");

export const localhost = "127.0.0.1";
