import { AttachmentList } from "./ArchiveWriter";
import { ExecutionDetail } from "./ExecutionDetail";
import { Fallible } from "../core/Fallible";
import { RunnableAnalysis } from "./Analysis";
import { SiteSyntax } from "../syntax/SiteSyntax";

export interface RunOptions {
  site: string;
  attachmentList: AttachmentList;
}

export interface OriginalAnalysis
  extends RunnableAnalysis<RunOptions, OriginalAnalysisResult> {}

export interface OriginalAnalysisResult {
  compatibility: SiteSyntax;
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
