import { readFileSync } from "fs";

export const readSitelistFromFile = (path: string): string[] => {
  return readFileSync(path)
    .toString()
    .split(/\r?\n/)
    .filter((x) => x);
};
