import { SiteSyntax } from "../compatibility/SiteSyntax";
import { Completion } from "../util/Completion";
import { Logfile } from "./Logfile";

export interface PrepareLogfile extends Logfile {
  type: "PrepareLogfile";
  sites: string[];
}

export type PrepareSiteResult = Completion<PrepareSiteDetail>;

export interface PrepareSiteDetail {
  syntax: SiteSyntax;
}
