import { incrementMapEntry, sortCountingMap } from "../util/Map";

import ArchiveReader from "./ArchiveReader";
import { deserializeOriginalAnalysisResult } from "./OriginalAnalysis";
import { distinctArray } from "../util/Array";
import { isSuccess } from "../util/Fallible";
import { maxESVersion } from "../compatibility/ESVersion";

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
  const sitesByESVersion = new Map<string, number>();
  const sitesByExternalScriptESVersion = new Map<string, number>();
  const sitesByInlineScriptESVersion = new Map<string, number>();
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

    incrementMapEntry(
      sitesByESVersion,
      scripts.length > 0 ? minimumESVersion : "nojs"
    );

    const externalScripts = scripts.filter(({ kind }) => kind === "external");
    incrementMapEntry(
      sitesByExternalScriptESVersion,
      externalScripts.length > 0
        ? maxESVersion(
            externalScripts.map(({ minimumESVersion }) => minimumESVersion)
          )
        : "nojs"
    );

    const inlineScripts = scripts.filter(({ kind }) => kind === "inline");
    incrementMapEntry(
      sitesByInlineScriptESVersion,
      inlineScripts.length > 0
        ? maxESVersion(
            inlineScripts.map(({ minimumESVersion }) => minimumESVersion)
          )
        : "nojs"
    );

    for (const categoryName of distinctArray(
      scripts.flatMap(({ categories }) =>
        categories.flatMap(({ esVersion, name }) => `${esVersion}:${name}`)
      )
    )) {
      incrementMapEntry(sitesByCategories, categoryName);
    }
  }

  console.log("# sites", sitelist.length);
  console.log("# failures", failures);
  console.log("sitesByESVersion", sortCountingMap(sitesByESVersion, -1));
  console.log(
    "sitesByExternalScriptESVersion",
    sortCountingMap(sitesByExternalScriptESVersion, -1)
  );
  console.log(
    "sitesByInlineScriptESVersion",
    sortCountingMap(sitesByInlineScriptESVersion, -1)
  );
  console.log("sitesByCategories", sortCountingMap(sitesByCategories, -1));
};
