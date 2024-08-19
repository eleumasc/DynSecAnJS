import { isSuccess, toCompletion } from "./Completion";

import _ from "lodash";
import { eachLimit } from "async";
import { retryOnce } from "./retryOnce";

export interface SiteProcessable {
  getSites(): string[];
  getProcessedSites(): string[];
  onSiteProcessed(site: string): void;
}

export const processEachSite = async (
  sp: SiteProcessable,
  concurrencyLimit: number,
  callback: (site: string) => Promise<void>
): Promise<void> => {
  const sites = sp.getSites();
  let processedSites = sp.getProcessedSites();

  const log = (msg: string) => {
    console.log(`[${processedSites.length} / ${sites.length}] ${msg}`);
  };

  await eachLimit(
    _.difference(sites, processedSites),
    concurrencyLimit,
    async (site, eachCallback) => {
      log(`begin process ${site}`);
      const completion = await retryOnce(() =>
        toCompletion(() => callback(site))
      );
      if (isSuccess(completion)) {
        processedSites = [...processedSites, site];
        sp.onSiteProcessed(site);
      } else {
        console.error(completion.error);
      }
      log(`end process ${site}`);

      eachCallback();
    }
  );

  console.log("DONE");
};
