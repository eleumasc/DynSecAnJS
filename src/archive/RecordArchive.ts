import Archive from "./Archive";
import { Logfile } from "./Logfile";

export interface RecordLogfile extends Logfile {
  type: "RecordLogfile";
}

export interface RecordReport {
  accessUrl: string;
  scriptUrls: string[];
}

export class RecordArchive extends Archive<RecordLogfile, RecordReport> {}
