import { Analysis } from "./Analysis";
import { AttachmentList } from "./ArchiveWriter";
import {
  CompatibilityDetail,
  serializeCompatibilityDetail,
} from "./compatibility/CompatibilityDetail";
import {
  deserializeExecutionDetail,
  ExecutionDetail,
  serializeExecutionDetail,
} from "./ExecutionDetail";
import {
  deserializeFallible,
  Fallible,
  serializeFallible,
} from "./util/Fallible";

export interface RunOptions {
  site: string;
  attachmentList: AttachmentList;
}

export interface OriginalAnalysis
  extends Analysis<RunOptions, OriginalAnalysisResult> {}

export interface OriginalAnalysisResult {
  compatibility: CompatibilityDetail;
  wprArchivePath: string;
  timeSeedMs: number;
  originalExecutions: Fallible<ExecutionDetail>[];
}

export const serializeOriginalAnalysisResult = (
  cooked: OriginalAnalysisResult
): any => {
  const { compatibility, originalExecutions, ...rest } = cooked;
  return {
    ...rest,
    compatibility: serializeCompatibilityDetail(compatibility),
    originalExecutions: originalExecutions.map((element) =>
      serializeFallible(element, serializeExecutionDetail)
    ),
  };
};

export const deserializeOriginalAnalysisResult = (
  raw: any
): OriginalAnalysisResult => {
  const { compatibility, originalExecutions, ...rest } = raw;
  return {
    ...rest,
    compatibility: deserializeExecutionDetail(compatibility),
    originalExecutions: originalExecutions.map((element: any) =>
      deserializeFallible(element, deserializeExecutionDetail)
    ),
  };
};
