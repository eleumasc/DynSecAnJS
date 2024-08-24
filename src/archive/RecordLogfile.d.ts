import { Completion } from "../util/Completion";
import { SitesState } from "../util/SitesState";
import { Logfile } from "./Logfile";

export interface RecordLogfile extends Logfile {
  type: "RecordLogfile";
  sitesState: SitesState;
}

export type RecordSiteResult = Completion<RecordSiteDetail>;

export interface RecordSiteDetail {
  accessUrl: string;
  scriptUrls: string[];
}
