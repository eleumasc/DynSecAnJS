import Archive from "./Archive";
import { Logfile } from "./Logfile";

export interface MeasureLogfile extends Logfile {
  type: "MeasureLogfile";
  preanalyzeArchiveName: string;
  collectArchiveNames: string[];
  syntaxReport?: any;
  toolReport?: any;
  libraryRanking?: any;
}

export class MeasureArchive extends Archive<MeasureLogfile, void> {}
