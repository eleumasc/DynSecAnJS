import path from "path";
import { CollectLogfile, CollectReport } from "../archive/CollectArchive";
import { isFailure } from "../util/Completion";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { SiteResult } from "../archive/Archive";

const DEBUG = false;

const WRITE = !DEBUG;

async function main() {
  const [
    transpileOnlyArchivePath,
    oldCollectArchivePath,
    newCollectArchivePath,
  ] = process.argv.slice(2);

  const canWrite = WRITE && Boolean(newCollectArchivePath);

  canWrite && mkdirSync(newCollectArchivePath);

  const transpileOnlyCollectLogfile = JSON.parse(
    readFileSync(
      path.resolve(transpileOnlyArchivePath, "logfile.json")
    ).toString()
  ) as CollectLogfile;

  const oldCollectLogfile = JSON.parse(
    readFileSync(
      path.resolve(transpileOnlyArchivePath, "logfile.json")
    ).toString()
  ) as CollectLogfile;

  let newSitesState = {};

  let errorCount = 0;
  let transpileFailureCount = 0;

  for (const [site, isProcessed] of Object.entries(
    transpileOnlyCollectLogfile.sitesState
  )) {
    let isNewProcessed = false;

    try {
      const newCollectSiteResult = ((): SiteResult<CollectReport> | null => {
        if (!isProcessed) return null;

        const transpileOnlyCollectSiteResult = JSON.parse(
          readFileSync(
            path.resolve(transpileOnlyArchivePath, `${site}.json`)
          ).toString()
        ) as SiteResult<CollectReport>;

        if (isFailure(transpileOnlyCollectSiteResult)) {
          transpileFailureCount += 1;
          return transpileOnlyCollectSiteResult;
        }

        if (!oldCollectLogfile.sitesState[site]) return null;

        const oldCollectSiteResult = JSON.parse(
          readFileSync(
            path.resolve(oldCollectArchivePath, `${site}.json`)
          ).toString()
        ) as SiteResult<CollectReport>;

        return oldCollectSiteResult;
      })();

      if (newCollectSiteResult) {
        canWrite &&
          writeFileSync(
            path.resolve(newCollectArchivePath, `${site}.json`),
            JSON.stringify(newCollectSiteResult)
          );

        isNewProcessed = true;
      }
    } catch (e) {
      errorCount += 1;
      console.error(e);
    }

    newSitesState = { ...newSitesState, [site]: isNewProcessed };
  }

  console.log("errorCount", errorCount);
  console.log("transpileFailureCount", transpileFailureCount);

  canWrite &&
    writeFileSync(
      path.resolve(newCollectArchivePath, "logfile.json"),
      JSON.stringify({
        ...oldCollectLogfile,
        sitesState: newSitesState,
      } satisfies CollectLogfile)
    );
}

main();
