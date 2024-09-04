import Archive from "./Archive";
import { HasSitesState } from "./SitesState";
import { Logfile } from "./Logfile";
import { Syntax } from "../syntax/Syntax";

export interface PreanalyzeLogfile extends Logfile, HasSitesState {
  type: "PreanalyzeLogfile";
  recordArchiveName: string;
}

export interface PreanalyzeReport extends Syntax {}

export class PreanalyzeArchive extends Archive<
  PreanalyzeLogfile,
  PreanalyzeReport
> {}
