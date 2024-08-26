import Archive from "./Archive";
import { BrowserName } from "../collection/BrowserName";
import { HasSitesState } from "./SitesState";
import { Logfile } from "./Logfile";
import { ProbesState } from "../collection/useProbesBundle";

export interface CollectBrowserLogfile extends Logfile, HasSitesState {
  type: "CollectBrowserLogfile";
  browserName: BrowserName;
  analyzeSyntaxArchiveName: string;
}

export interface CollectBrowserSiteDetail {
  runs: RunDetail[];
}

export interface RunDetail {
  probesState: ProbesState;
  executionTime: number;
}

export class CollectBrowserArchive extends Archive<
  CollectBrowserLogfile,
  CollectBrowserSiteDetail
> {}
