import path from "path";
import { readdirSync, readFileSync } from "fs";

export const readDirFiles = (directoryPath: string): string[] => {
  return readdirSync(directoryPath).map((file) => {
    const filePath = path.join(directoryPath, file);
    const content = readFileSync(filePath).toString();
    return content;
  });
};
