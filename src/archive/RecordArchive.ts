import Archive from "./Archive";
import { HasSitesState } from "./SitesState";
import { Logfile } from "./Logfile";

export interface RecordLogfile extends Logfile, HasSitesState {
  type: "RecordLogfile";
}

export interface RecordReport {
  accessUrl: string;
  scriptUrls: string[];
}

export class RecordArchive extends Archive<RecordLogfile, RecordReport> {}
