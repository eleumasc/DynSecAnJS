import {
  SitesState,
  getProcessedSitesInSitesState,
  getSitesInSitesState,
} from "./SitesState";
import { isSuccess, toCompletion } from "./Completion";

import _ from "lodash";
import { eachLimit } from "async";

export interface ProcessSitesController {
  getInitialSitesState(): SitesState;
  onSiteProcessed(site: string, sitesState: SitesState): void;
}

export const processSites = async (
  controller: ProcessSitesController,
  concurrencyLimit: number,
  callback: (site: string) => Promise<void>
): Promise<void> => {
  let sitesState = controller.getInitialSitesState();
  const sites = getSitesInSitesState(sitesState);
  const processedSites = getProcessedSitesInSitesState(sitesState);

  const log = (msg: string) => {
    console.log(`[${processedSites.length} / ${sites.length}] ${msg}`);
  };

  await eachLimit(
    _.difference(sites, processedSites),
    concurrencyLimit,
    async (site, eachCallback) => {
      log(`begin process ${site}`);
      const completion = await toCompletion(() => callback(site));
      if (isSuccess(completion)) {
        processedSites.push(site);
        sitesState = { ...sitesState, [site]: true };
        controller.onSiteProcessed(site, sitesState);
      } else {
        console.error(completion.error);
      }
      log(`end process ${site}`);

      eachCallback();
    }
  );

  console.log("DONE");
};
