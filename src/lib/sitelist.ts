import { readFileSync, writeFileSync } from "fs";

export const readSitelistFromFile = (path: string): string[] => {
  return readFileSync(path)
    .toString()
    .split(/\r?\n/)
    .filter((x) => x);
};

export const writeSitelistToFile = (path: string, sitelist: string[]): void => {
  writeFileSync(path, sitelist.join("\n"));
};
