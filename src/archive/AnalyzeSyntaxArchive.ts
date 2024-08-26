import Archive from "./Archive";
import { HasSitesState } from "./SitesState";
import { Logfile } from "./Logfile";
import { Syntax } from "../syntax/Syntax";

export interface AnalyzeSyntaxLogfile extends Logfile, HasSitesState {
  type: "AnalyzeSyntaxLogfile";
  recordArchiveName: string;
}

export interface AnalyzeSyntaxSiteDetail extends Syntax {}

export class AnalyzeSyntaxArchive extends Archive<
  AnalyzeSyntaxLogfile,
  AnalyzeSyntaxSiteDetail
> {}
