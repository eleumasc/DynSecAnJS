import WPRArchive from "../wprarchive/WPRArchive";
import path from "path";
import { useTempDirectory } from "../util/TempDirectory";

export const useTransformedWPRArchive = async <T>(
  originalPath: string,
  transformCallback: ((wprArchive: WPRArchive) => Promise<WPRArchive>) | null,
  use: (transformedPath: string) => Promise<T>
): Promise<T> => {
  if (!transformCallback) {
    return await use(originalPath);
  }

  const originalArchive = WPRArchive.fromFile(originalPath);
  const transformedArchive = await transformCallback(originalArchive);

  return await useTempDirectory(async (tempPath) => {
    const transformedPath = path.join(tempPath, "archive.wprgo");
    transformedArchive.toFile(transformedPath);

    return await use(transformedPath);
  });
};
