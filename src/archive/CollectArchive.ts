import Archive from "./Archive";
import { BrowserOrToolName } from "../collection/ToolName";
import { Completion } from "../util/Completion";
import { HasSitesState } from "./SitesState";
import { Logfile } from "./Logfile";
import { MonitorState } from "../collection/MonitorBundle";
import { ScriptTransformErrorLog } from "../collection/WPRArchiveTransformer";

export interface CollectLogfile extends Logfile, HasSitesState {
  type: "CollectLogfile";
  browserOrToolName: BrowserOrToolName;
  preanalyzeArchiveName: string;
}

export interface CollectReport {
  transpiled: boolean;
  scriptTransformLogs: ScriptTransformErrorLog[];
  runsCompletion: Completion<RunDetail[]>;
  crashRawFlows?: string[];
}

export interface RunDetail {
  monitorState: MonitorState;
  executionTime: number;
}

export class CollectArchive extends Archive<CollectLogfile, CollectReport> {}
