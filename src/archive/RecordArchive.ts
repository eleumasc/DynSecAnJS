import Archive from "./Archive";
import { BrowserContext } from "playwright";
import { HasSitesState } from "./SitesState";
import { Logfile } from "./Logfile";

export interface RecordLogfile extends Logfile, HasSitesState {
  type: "RecordLogfile";
}

export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

export interface RecordReport {
  accessUrl: string;
  storageState: StorageState;
}

export class RecordArchive extends Archive<RecordLogfile, RecordReport> {}
