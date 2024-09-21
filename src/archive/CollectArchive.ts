import Archive from "./Archive";
import { BrowserOrToolName } from "../collection/ToolName";
import { Completion } from "../util/Completion";
import { Logfile } from "./Logfile";
import { MonitorState } from "../collection/MonitorBundle";
import { ScriptTransformErrorLog } from "../collection/WPRArchiveTransformer";

export interface CollectLogfile extends Logfile {
  type: "CollectLogfile";
  browserOrToolName: BrowserOrToolName;
  preanalyzeArchiveName: string;
}

export interface CollectReport {
  transpiled: boolean;
  scriptTransformLogs: ScriptTransformErrorLog[];
  runsCompletion: Completion<RunDetail[]>;
}

export interface RunDetail {
  monitorState: MonitorState;
  executionTime: number;
}

export class CollectArchive extends Archive<CollectLogfile, CollectReport> {}
