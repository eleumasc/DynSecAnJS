import "dotenv/config";

import assert from "assert";

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
export const wprgoPath = get("WPRGO_PATH");
export const jestPath = get("JEST_PATH");
export const ifTranspilerPath = get("IFTRANSPILER_PATH");
export const jalangiPath = get("JALANGI_PATH");
export const aranLinvailPath = get("ARAN_LINVAIL_PATH");
export const geckoDriverPath = get("GECKODRIVER_PATH");
export const projectFoxhoundPath = get("PROJECT_FOXHOUND_PATH");
