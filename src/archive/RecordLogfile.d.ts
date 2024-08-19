import { Completion } from "../util/Completion";
import { Logfile } from "./Logfile";

export interface RecordLogfile extends Logfile {
  type: "RecordLogfile";
  sites: string[];
}

export type RecordSiteResult = Completion<RecordSiteDetail>;

export interface RecordSiteDetail {
  accessUrl: string;
  scriptUrls: string[];
}
