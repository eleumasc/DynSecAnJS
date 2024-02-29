import { Analysis } from "./Analysis";
import { AttachmentList } from "./ArchiveWriter";
import {
  serializeExecutionDetail,
  deserializeExecutionDetail,
} from "./ExecutionDetail";
import { ExecutionDetail } from "./ExecutionDetail";
import { ESVersion } from "./compatibility/ESVersion";
import {
  Fallible,
  serializeFallible,
  deserializeFallible,
} from "./util/Fallible";

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
  compatible: boolean;
  toolExecutions: Fallible<ExecutionDetail>[];
}

export const serializeToolAnalysisResult = (
  cooked: ToolAnalysisResult
): any => {
  const { toolExecutions, ...rest } = cooked;
  return {
    ...rest,
    toolExecutions: toolExecutions.map((element) =>
      serializeFallible(element, serializeExecutionDetail)
    ),
  };
};

export const deserializeToolAnalysisResult = (raw: any): ToolAnalysisResult => {
  const { toolExecutions, ...rest } = raw;
  return {
    ...rest,
    toolExecutions: toolExecutions.map((element: any) =>
      deserializeFallible(element, deserializeExecutionDetail)
    ),
  };
};
