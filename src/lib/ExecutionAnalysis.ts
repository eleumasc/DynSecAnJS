import { AttachmentList } from "./Archive";
import FeatureSet from "./FeatureSet";
import { JavaScriptVersion } from "./compatibility/JavaScriptVersion";
import {
  Fallible,
  serializeFallible,
  deserializeFallible,
  Success,
} from "./util/Fallible";

export interface RunOptions {
  site: string;
  minimumJavaScriptVersion: JavaScriptVersion;
  wprArchivePath: string;
  attachmentList: AttachmentList;
}

export interface ExecutionAnalysis {
  run(runOptions: RunOptions): Promise<Fallible<ExecutionAnalysisResult>>;
  terminate(): Promise<void>;
}

export interface ExecutionAnalysisResult {
  originalExecutions: Fallible<ExecutionDetail>[];
  toolExecutions: Fallible<ExecutionDetail>[];
}

export interface ExecutionDetail {
  pageUrl: string;
  screenshotFile?: string;
  featureSet: FeatureSet;
  loadingCompleted: boolean;
  executionTimeMs: number;
}

export const serializeExecutionAnalysisResult = (
  concrete: ExecutionAnalysisResult
): any => {
  const { originalExecutions, toolExecutions } = concrete;
  return {
    originalExecutions: originalExecutions.map((element) =>
      serializeFallible(element, serializeExecutionDetail)
    ),
    toolExecutions: toolExecutions.map((element) =>
      serializeFallible(element, serializeExecutionDetail)
    ),
  };
};

export const deserializeExecutionAnalysisResult = (
  data: any
): ExecutionAnalysisResult => {
  const { originalExecutions, toolExecutions } = data;
  return {
    originalExecutions: originalExecutions.map((element: any) =>
      deserializeFallible(element, deserializeExecutionDetail)
    ),
    toolExecutions: toolExecutions.map((element: any) =>
      deserializeFallible(element, deserializeExecutionDetail)
    ),
  };
};

export const serializeExecutionDetail = (concrete: ExecutionDetail): any => {
  const { featureSet, ...rest } = concrete;
  return { ...rest, featureSet: featureSet.serialize() };
};

export const deserializeExecutionDetail = (data: any): ExecutionDetail => {
  const { featureSet, ...rest } = data;
  return { ...rest, featureSet: featureSet.deserialize() };
};

export const mapSuccessExecutionsToFeatureSets = (
  successes: Success<ExecutionDetail>[]
): FeatureSet[] => successes.map(({ val: { featureSet } }) => featureSet);
