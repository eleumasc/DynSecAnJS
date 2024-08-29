import {
  HasSitesState,
  SitesState,
  getProcessedSitesInSitesState,
  getSitesInSitesState,
} from "../archive/SitesState";
import { isSuccess, toCompletion } from "./Completion";

import Archive from "../archive/Archive";
import { Logfile } from "../archive/Logfile";
import _ from "lodash";
import { queue } from "async";

export interface ProcessSitesController {
  getInitialSitesState(): SitesState;
  onSiteProcessed(site: string, sitesState: SitesState): void;
}

export const processSites = async (
  controller: ProcessSitesController,
  concurrencyLimit: number,
  processSite: (site: string) => Promise<void>
): Promise<void> => {
  let sitesState = controller.getInitialSitesState();
  const sites = getSitesInSitesState(sitesState);
  const processedSites = getProcessedSitesInSitesState(sitesState);

  const log = (msg: string) => {
    console.log(`[${processedSites.length} / ${sites.length}] ${msg}`);
  };

  const q = queue<string>(async (site, callback) => {
    log(`begin process ${site}`);
    const completion = await toCompletion(() => processSite(site));
    if (isSuccess(completion)) {
      processedSites.push(site);
      sitesState = { ...sitesState, [site]: true };
      controller.onSiteProcessed(site, sitesState);
    } else {
      console.error(completion.error);
    }
    log(`end process ${site}`);
    callback();
  }, concurrencyLimit);

  for (const site of _.difference(sites, processedSites)) {
    q.push(site);
  }

  await q.drain();

  log("DONE");
};

export class ArchiveProcessSitesController<
  TLogfile extends Logfile & HasSitesState
> implements ProcessSitesController
{
  constructor(readonly archive: Archive<TLogfile, unknown>) {}

  getInitialSitesState(): SitesState {
    return this.archive.logfile.sitesState;
  }

  onSiteProcessed(_site: string, sitesState: SitesState): void {
    const { logfile } = this.archive;
    this.archive.logfile = { ...logfile, sitesState };
  }
}
