import {
  ExecutionTrace,
  brokenExecutionTraces,
  createExecutionTrace,
  findPredominantExecutionTrace,
} from "./ExecutionTrace";
import { Fallible, isSuccess } from "../core/Fallible";
import { avg, stdev } from "../core/math";

import { ExecutionDetail } from "../lib/ExecutionDetail";
import { OriginalAnalysisResult } from "../lib/OriginalAnalysis";
import { ToolAnalysisResult } from "../lib/ToolAnalysis";
import { subtractSets } from "../core/Set";

export interface SiteInfo {
  site: string;
  accessible: boolean; // no general failure in original
  analyzable: boolean; // no general failure in both original and tool and no execution failure in both original and tool, for at least one (the first) execution
  compatibility: CompatibilityInfo | null; // non-null if analyzable is true
}

export interface CompatibilityInfo {
  syntacticallyCompatible: boolean;
  eventuallyCompatible: boolean;
  transparencyAnalyzable: boolean; // no execution failure in both original and tool, for all executions
  loadingCompleteness: LoadingCompletenessInfo | null; // non-null if both eventuallyCompatible and transparencyAnalyzable are true
}

export interface LoadingCompletenessInfo {
  originalLoadingCompleted: boolean;
  toolLoadingCompleted: boolean;
  predominantTraceExistance: PredominantTraceExistanceInfo | null; // non-null if both origLoadingComplete and toolLoadingComplete are true
}

export interface PredominantTraceExistanceInfo {
  originalTraceExists: boolean;
  toolTraceExists: boolean;
  transparency: TransparencyInfo | null; // non-null if both originalPredominantTraceExists and toolPredominantTraceExists are true
}

export interface TransparencyInfo {
  transparent: boolean;
  brokenFeatures: string[];
  performance: PerformanceInfo | null; // non-null if transparent is true
}

export interface PerformanceInfo {
  originalExecutionTimeMs: number;
  originalExecutionTimeErrorMs: number;
  toolExecutionTimeMs: number;
  toolExecutionTimeErrorMs: number;
}

export const getSiteInfo = (
  site: string,
  fallibleOriginalResult: Fallible<OriginalAnalysisResult>,
  fallibleToolResult: Fallible<ToolAnalysisResult>
): SiteInfo => {
  const accessible = isSuccess(fallibleOriginalResult);
  const semiAnalyzable =
    isSuccess(fallibleOriginalResult) && isSuccess(fallibleToolResult);
  if (!semiAnalyzable) {
    return { site, accessible, analyzable: false, compatibility: null };
  }
  const { val: originalResult } = fallibleOriginalResult;
  const { val: toolResult } = fallibleToolResult;
  const { originalExecutions: fallibleOriginalExecutions } = originalResult;
  const { toolExecutions: fallibleToolExecutions } = toolResult;
  const successOriginalFirstExecution =
    fallibleOriginalExecutions.find(isSuccess) ?? null;
  const successToolFirstExecution =
    fallibleToolExecutions.find(isSuccess) ?? null;
  const analyzable =
    successOriginalFirstExecution !== null &&
    successToolFirstExecution !== null;
  return {
    site,
    accessible,
    analyzable,
    compatibility: analyzable
      ? getCompatibilityInfo(
          successOriginalFirstExecution.val,
          successToolFirstExecution.val,
          originalResult,
          toolResult
        )
      : null,
  };
};

export const getCompatibilityInfo = (
  originalFirstExecution: ExecutionDetail,
  toolFirstExecution: ExecutionDetail,
  originalResult: OriginalAnalysisResult,
  toolResult: ToolAnalysisResult
): CompatibilityInfo => {
  const { originalExecutions: fallibleOriginalExecutions } = originalResult;
  const {
    toolName,
    compatible: syntacticallyCompatible,
    toolExecutions: fallibleToolExecutions,
  } = toolResult;
  const eventuallyCompatible = ((): boolean => {
    switch (toolName) {
      case "ChromiumTaintTracking":
      case "JSFlow":
      case "ProjectFoxhound": {
        const uncaughtSyntaxErrors = ({ uncaughtErrors }: ExecutionDetail) =>
          new Set(uncaughtErrors.filter((msg) => msg.includes("SyntaxError")));
        return (
          subtractSets(
            uncaughtSyntaxErrors(toolFirstExecution),
            uncaughtSyntaxErrors(originalFirstExecution)
          ).size > 0
        );
      }
      case "JEST":
      case "IFTranspiler":
      case "GIFC":
      case "Jalangi":
      case "Linvail":
        return toolFirstExecution.transformErrors.length > 0;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  })();
  const transparencyAnalyzable =
    eventuallyCompatible &&
    fallibleOriginalExecutions.every(isSuccess) &&
    fallibleToolExecutions.every(isSuccess);
  return {
    syntacticallyCompatible,
    eventuallyCompatible,
    transparencyAnalyzable,
    loadingCompleteness: transparencyAnalyzable
      ? getLoadingCompletenessInfo(
          fallibleOriginalExecutions.map(({ val }) => val),
          fallibleToolExecutions.map(({ val }) => val)
        )
      : null,
  };
};

export const getLoadingCompletenessInfo = (
  originalExecutions: ExecutionDetail[],
  toolExecutions: ExecutionDetail[]
): LoadingCompletenessInfo => {
  const checkLoadingCompleted = (executions: ExecutionDetail[]): boolean =>
    executions.every((execution) => execution.loadingCompleted);
  const originalLoadingCompleted = checkLoadingCompleted(originalExecutions);
  const toolLoadingCompleted = checkLoadingCompleted(toolExecutions);
  const loadingCompleted = originalLoadingCompleted && toolLoadingCompleted;
  return {
    originalLoadingCompleted,
    toolLoadingCompleted,
    predominantTraceExistance: loadingCompleted
      ? getPredominantTraceExistanceInfo(originalExecutions, toolExecutions)
      : null,
  };
};

export const getPredominantTraceExistanceInfo = (
  originalExecutions: ExecutionDetail[],
  toolExecutions: ExecutionDetail[]
): PredominantTraceExistanceInfo => {
  const THRESHOLD = 3;
  const originalTrace = findPredominantExecutionTrace(
    originalExecutions.map((execution) => createExecutionTrace(execution)),
    THRESHOLD
  );
  const toolTrace = findPredominantExecutionTrace(
    toolExecutions.map((execution) => createExecutionTrace(execution)),
    THRESHOLD
  );
  const originalTraceExists = originalTrace !== null;
  const toolTraceExists = toolTrace !== null;
  const bothTracesExist = originalTraceExists && toolTraceExists;
  return {
    originalTraceExists,
    toolTraceExists,
    transparency: bothTracesExist
      ? getTransparencyInfo(
          originalTrace,
          toolTrace,
          originalExecutions,
          toolExecutions
        )
      : null,
  };
};

export const getTransparencyInfo = (
  originalTrace: ExecutionTrace,
  toolTrace: ExecutionTrace,
  originalExecutions: ExecutionDetail[],
  toolExecutions: ExecutionDetail[]
): TransparencyInfo => {
  const brokenFeatures = brokenExecutionTraces(originalTrace, toolTrace);
  const transparent = brokenFeatures.size === 0;
  return {
    transparent,
    brokenFeatures: [...brokenFeatures],
    performance: getPerformanceInfo(originalExecutions, toolExecutions),
  };
};

export const getPerformanceInfo = (
  originalExecutions: ExecutionDetail[],
  toolExecutions: ExecutionDetail[]
): PerformanceInfo => {
  const computeStats = (executions: ExecutionDetail[]) => {
    const executionTimes = executions.map(
      (execution) => execution.executionTimeMs
    );
    return {
      executionTimeMs: avg(executionTimes),
      executionTimeErrorMs: stdev(executionTimes),
    };
  };
  const {
    executionTimeMs: originalExecutionTimeMs,
    executionTimeErrorMs: originalExecutionTimeErrorMs,
  } = computeStats(originalExecutions);
  const {
    executionTimeMs: toolExecutionTimeMs,
    executionTimeErrorMs: toolExecutionTimeErrorMs,
  } = computeStats(toolExecutions);
  return {
    originalExecutionTimeMs,
    originalExecutionTimeErrorMs,
    toolExecutionTimeMs,
    toolExecutionTimeErrorMs,
  };
};
