import ArchiveReader from "./ArchiveReader";
import {
  deserializeOriginalAnalysisResult,
} from "./OriginalAnalysis";
import { isSuccess } from "./util/Fallible";
import { ESVersion } from "./compatibility/ESVersion";
import { distinctArray } from "./util/array";
import { sortMap } from "./util/map";

export interface CompatibilityArgs {
  originalArchivePath: string;
}

export const startCompatibility = async (args: CompatibilityArgs) => {
  const { originalArchivePath } = args;

  const archive = new ArchiveReader(
    originalArchivePath,
    "original-analysis",
    deserializeOriginalAnalysisResult
  );
  const sitelist = archive.getSitelist();

  let failures = 0;
  let nojs = 0;
  const sitesByESVersion = new Map<ESVersion, number>();
  const sitesByCategories = new Map<string, number>();
  for (const site of sitelist) {
    const logfile = archive.load(site);
    const fallibleResult = logfile.data;
    if (!isSuccess(fallibleResult)) {
      failures += 1;
      continue;
    }

    const {
      val: {
        compatibility: { minimumESVersion, scripts },
      },
    } = fallibleResult;

    if (scripts.length === 0) {
      nojs += 1;
    }

    sitesByESVersion.set(
      minimumESVersion,
      (sitesByESVersion.get(minimumESVersion) ?? 0) + 1
    );

    for (const categoryName of distinctArray(
      scripts.flatMap(({ categories }) =>
        categories.flatMap(({ name }) => name)
      )
    )) {
      sitesByCategories.set(
        categoryName,
        (sitesByCategories.get(categoryName) ?? 0) + 1
      );
    }
  }

  console.log("# sites", sitelist.length);
  console.log("# failures", failures);
  console.log("# nojs", nojs);
  console.log(
    "sitesByESVersion",
    sortMap(sitesByESVersion, ([_1, v1], [_2, v2]) => -(v1 - v2))
  );
  console.log(
    "sitesByCategories",
    sortMap(sitesByCategories, ([_1, v1], [_2, v2]) => -(v1 - v2))
  );
};
