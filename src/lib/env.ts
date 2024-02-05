import assert from "assert";
import "dotenv/config";

const get = (key: string): string => {
  const value = process.env[key] as string | undefined;
  assert(typeof value === "string");
  return value;
};

export const jalangiPath = get("JALANGI_PATH");
export const wprgoPath = get("WPRGO_PATH");
