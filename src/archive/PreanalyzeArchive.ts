import Archive from "./Archive";
import { Logfile } from "./Logfile";
import { Syntax } from "../syntax/Syntax";

export interface PreanalyzeLogfile extends Logfile {
  type: "PreanalyzeLogfile";
  recordArchiveName: string;
}

export interface PreanalyzeReport extends Syntax {}

export class PreanalyzeArchive extends Archive<
  PreanalyzeLogfile,
  PreanalyzeReport
> {}
