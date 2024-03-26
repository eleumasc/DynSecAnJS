import { AttachmentList } from "./ArchiveWriter";
import { CompatibilityDetail } from "../compatibility/CompatibilityDetail";
import { ExecutionDetail } from "./ExecutionDetail";
import { Fallible } from "../core/Fallible";
import { RunnableAnalysis } from "./Analysis";

export interface RunOptions {
  site: string;
  attachmentList: AttachmentList;
}

export interface OriginalAnalysis
  extends RunnableAnalysis<RunOptions, OriginalAnalysisResult> {}

export interface OriginalAnalysisResult {
  compatibility: CompatibilityDetail;
  wprArchiveFile: string;
  timeSeedMs: number;
  originalExecutions: Fallible<ExecutionDetail>[];
}

export const serializeOriginalAnalysisResult = (
  cooked: OriginalAnalysisResult
): any => {
  return cooked;
};

export const deserializeOriginalAnalysisResult = (
  raw: any
): OriginalAnalysisResult => {
  return raw;
};
