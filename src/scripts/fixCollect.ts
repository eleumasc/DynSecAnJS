import path from "path";
import { CollectLogfile } from "../archive/CollectArchive";
import { existsSync, readFileSync, writeFileSync } from "fs";

const DEBUG = false;

const WRITE = !DEBUG;

async function main() {
  const [collectArchivePath] = process.argv.slice(2);

  const canWrite = WRITE;

  const collectLogfile = JSON.parse(
    readFileSync(path.resolve(collectArchivePath, "logfile.json")).toString()
  ) as CollectLogfile;

  let newSitesState = {};

  let errorCount = 0;

  for (const site of Object.keys(collectLogfile.sitesState)) {
    let isNewProcessed = false;

    try {
      if (existsSync(path.resolve(collectArchivePath, `${site}.json`))) {
        isNewProcessed = true;
      }
    } catch (e) {
      errorCount += 1;
      console.error(e);
    }

    newSitesState = { ...newSitesState, [site]: isNewProcessed };
  }

  console.log("errorCount", errorCount);

  canWrite &&
    writeFileSync(
      path.resolve(collectArchivePath, "logfile.json"),
      JSON.stringify({
        ...collectLogfile,
        sitesState: newSitesState,
      } satisfies CollectLogfile)
    );
}

main();
