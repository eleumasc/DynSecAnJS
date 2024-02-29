import { AttachmentList } from "./ArchiveWriter";
import { ExecutionDetail } from "./ExecutionDetail";
import { WebPageReplayOperation } from "./WebPageReplay";
import { Fallible } from "./util/Fallible";
import { Options as WebPageReplayOptions } from "./WebPageReplay";
import { MonitorWaitUntil } from "./monitor";

export interface RunOptions {
  url: string;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
  timeSeedMs: number;
  loadingTimeoutMs: number;
  waitUntil: MonitorWaitUntil;
  analysisDelayMs: number;
  attachmentList?: AttachmentList;
}

export interface Agent<AnalysisResult> {
  run(runOptions: RunOptions): Promise<Fallible<AnalysisResult>>;
  terminate(): Promise<void>;
}

export type AgentFactory<AnalysisResult> = () => Promise<Agent<AnalysisResult>>;
