import { AttachmentList } from "./ArchiveWriter";
import { Fallible } from "../util/Fallible";
import { Options as WebPageReplayOptions } from "./WebPageReplay";
import { MonitorWaitUntil } from "./monitor";

export interface RunOptions {
  url: string;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
  timeSeedMs: number;
  loadingTimeoutMs: number;
  waitUntil: MonitorWaitUntil;
  delayMs: number;
  attachmentList?: AttachmentList;
  compatMode: boolean;
}

export interface Agent<AnalysisResult> {
  run(runOptions: RunOptions): Promise<Fallible<AnalysisResult>>;
  terminate(): Promise<void>;
}

export type AgentFactory<AnalysisResult> = () => Promise<Agent<AnalysisResult>>;
