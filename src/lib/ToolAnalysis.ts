import { Analysis } from "./Analysis";
import { AttachmentList } from "./ArchiveWriter";
import { ESVersion } from "../compatibility/ESVersion";
import { ExecutionDetail } from "./ExecutionDetail";
import { Fallible } from "../core/Fallible";

export interface RunOptions {
  site: string;
  minimumESVersion: ESVersion;
  wprArchivePath: string;
  timeSeedMs: number;
  attachmentList: AttachmentList;
}

export interface ToolAnalysis
  extends Analysis<RunOptions, ToolAnalysisResult> {}

export interface ToolAnalysisResult {
  toolName: string;
  compatible: boolean;
  toolExecutions: Fallible<ExecutionDetail>[];
}

export const serializeToolAnalysisResult = (
  cooked: ToolAnalysisResult
): any => {
  return cooked;
};

export const deserializeToolAnalysisResult = (raw: any): ToolAnalysisResult => {
  return raw;
};
