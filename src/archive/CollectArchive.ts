import Archive from "./Archive";
import { BrowserOrToolName } from "../collection/ToolName";
import { Completion } from "../util/Completion";
import { HasSitesState } from "./SitesState";
import { Logfile } from "./Logfile";
import { MonitorState } from "../collection/MonitorBundle";

export interface CollectLogfile extends Logfile, HasSitesState {
  type: "CollectLogfile";
  browserOrToolName: BrowserOrToolName;
  preanalyzeArchiveName: string;
}

export interface CollectReport {
  transpiled: boolean;
  transformErrors: string[];
  runsCompletion: Completion<RunDetail[]>;
}

export interface RunDetail {
  monitorState: MonitorState;
  executionTime: number;
}

export class CollectArchive extends Archive<CollectLogfile, CollectReport> {}
