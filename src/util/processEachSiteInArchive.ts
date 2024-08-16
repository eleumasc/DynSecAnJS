import { isSuccess, toCompletion } from "./Completion";

import Archive from "../archive/Archive";
import _ from "lodash";
import { eachLimit } from "async";
import { retryOnce } from "./retryOnce";

export const processEachSiteInArchive = async (
  archive: Archive,
  concurrencyLimit: number,
  callback: (site: string) => Promise<void>
): Promise<void> => {
  const log = (msg: string) => {
    console.log(
      `[${archive.logfile.sites.length} / ${archive.logfile.todoSites.length}] ${msg}`
    );
  };

  await eachLimit(
    archive.remainingSites,
    concurrencyLimit,
    async (site, eachCallback) => {
      log(`begin process ${site}`);
      const completion = await retryOnce(() =>
        toCompletion(() => callback(site))
      );
      if (isSuccess(completion)) {
        archive.markSiteAsDone(site);
      } else {
        console.error(completion.message);
      }
      log(`end process ${site}`);

      eachCallback();
    }
  );

  console.log("DONE");
};
