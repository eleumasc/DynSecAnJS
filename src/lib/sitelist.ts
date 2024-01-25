import { readFileSync } from "fs";

export const loadSitelistFromFile = (path: string) => {
  return readFileSync(path)
    .toString()
    .split(/\r?\n/)
    .filter((x) => x);
};
