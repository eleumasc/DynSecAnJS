import { readFileSync, writeFileSync } from "fs";
import { intersectSets } from "../util/set";

export const readSitelistFromFile = (path: string): string[] => {
  return readFileSync(path)
    .toString()
    .split(/\r?\n/)
    .filter((x) => x);
};

export const writeSitelistToFile = (path: string, sitelist: string[]): void => {
  writeFileSync(path, sitelist.join("\n"));
};

export const intersectSitelists = (
  sitelist1: string[],
  sitelist2: string[]
): string[] => {
  return [...intersectSets(new Set(sitelist1), new Set(sitelist2))];
};
