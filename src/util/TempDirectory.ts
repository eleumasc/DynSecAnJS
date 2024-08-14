import { mkdtempSync, rmSync } from "fs";

import path from "path";
import { tmpdir } from "os";

export const useTempDirectory = async <T>(
  use: (tempPath: string) => Promise<T>
): Promise<T> => {
  const tempPath = mkdtempSync(path.join(tmpdir(), "dynsecanjs-"));

  try {
    return await use(tempPath);
  } finally {
    rmSync(tempPath, { recursive: true, force: true });
  }
};
