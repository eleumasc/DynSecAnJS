import path from "path";
import WPRArchive from "../wprarchive/WPRArchive";
import { useTempDirectory } from "../util/TempDirectory";

export const useTransformedWPRArchive = async <T>(
  originalWPRArchivePath: string,
  originalWPRArchive: WPRArchive,
  transformedWPRArchive: WPRArchive,
  use: (wprArchivePath: string) => Promise<T>
): Promise<T> => {
  if (transformedWPRArchive === originalWPRArchive) {
    return await use(originalWPRArchivePath);
  }

  return await useTempDirectory(async (tempPath) => {
    const transformedPath = path.join(tempPath, "archive.wprgo");
    transformedWPRArchive.toFile(transformedPath);

    return await use(transformedPath);
  });
};
