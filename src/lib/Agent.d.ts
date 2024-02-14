import { AttachmentList } from "./Archive";
import { ExecutionDetail } from "./ExecutionAnalysis";
import { WebPageReplayOperation } from "./WebPageReplay";
import { Fallible } from "./util/Fallible";

export interface RunOptions {
  url: string;
  wprArchivePath: string;
  wprOperation?: WebPageReplayOperation;
  attachmentList?: AttachmentList;
}

export interface Agent {
  run(runOptions: RunOptions): Promise<Fallible<ExecutionDetail>>;
  terminate(): Promise<void>;
}

export type AgentFactory = () => Promise<Agent>;
