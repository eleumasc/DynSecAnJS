import { Fallible, isSuccess } from "./core/Fallible";
import {
  OriginalAnalysisResult,
  deserializeOriginalAnalysisResult,
} from "./lib/OriginalAnalysis";

import ArchiveReader from "./lib/ArchiveReader";
import { intersectSets } from "./core/Set";
import { writeFileSync } from "fs";

const computeAccessibleSitelist = (
  originalArchivePaths: string[],
  isAccessible: (result: Fallible<OriginalAnalysisResult>) => boolean
): string[] => {
  const sitelists = originalArchivePaths.map((originalArchivePath) => {
    const originalArchive = new ArchiveReader(
      originalArchivePath,
      "original-analysis",
      deserializeOriginalAnalysisResult
    );
    const originalSitelist = originalArchive.getSitelist();

    return originalSitelist
      .map((site) => originalArchive.load(site))
      .filter((logfile) => isAccessible(logfile.data))
      .map((logfile) => logfile.site);
  });

  return [...intersectSets(...sitelists.map((sitelist) => new Set(sitelist)))];
};

const computeTransparencySitelist = (
  originalArchivePaths: string[]
): string[] => {
  const semiAccessible = computeAccessibleSitelist(
    originalArchivePaths,
    (result) => isSuccess(result)
  );
  const accessible = computeAccessibleSitelist(
    originalArchivePaths,
    (result) => isSuccess(result) && result.val.compatibility.scripts.length > 0
  );

  console.log("semiAccessible", semiAccessible.length);
  console.log("accessible", accessible.length);

  return accessible;
};

const main = async () => {
  const result = computeTransparencySitelist(process.argv.slice(2));
  console.log(result);
  writeFileSync("out.txt", result.join("\n"));
};

main();
