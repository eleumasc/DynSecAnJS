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
  analyzable: boolean; // no general failure in both original and tool and no execution failure in both original and tool, for all executions
  compatibility: CompatibilityInfo | null; // non-null if analyzable is true
}

export interface CompatibilityInfo {
  syntacticallyCompatible: boolean;
  eventuallyCompatible: boolean;
  loadingCompleteness: LoadingCompletenessInfo | null; // non-null if eventuallyCompatible is true
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
  const nonAnalyzableSiteInfo = (): SiteInfo => {
    return { site, accessible, analyzable: false, compatibility: null };
  };
  const semiAnalyzable =
    isSuccess(fallibleOriginalResult) && isSuccess(fallibleToolResult);
  if (!semiAnalyzable) {
    return nonAnalyzableSiteInfo();
  }
  const { val: originalResult } = fallibleOriginalResult;
  const { val: toolResult } = fallibleToolResult;
  const { originalExecutions: fallibleOriginalExecutions } = originalResult;
  const {
    toolName,
    compatible: syntacticallyCompatible,
    toolExecutions: fallibleToolExecutions,
  } = toolResult;
  const analyzable =
    fallibleOriginalExecutions.every(isSuccess) &&
    fallibleToolExecutions.every(isSuccess);
  if (!analyzable) {
    return nonAnalyzableSiteInfo();
  }
  return {
    site,
    accessible,
    analyzable,
    compatibility: analyzable
      ? getCompatibilityInfo(
          fallibleOriginalExecutions.map(({ val }) => val),
          fallibleToolExecutions.map(({ val }) => val),
          toolName,
          syntacticallyCompatible
        )
      : null,
  };
};

export const getCompatibilityInfo = (
  originalExecutions: ExecutionDetail[],
  toolExecutions: ExecutionDetail[],
  toolName: string,
  syntacticallyCompatible: boolean
): CompatibilityInfo => {
  const eventuallyCompatible = ((): boolean => {
    switch (toolName) {
      case "ChromiumTaintTracking":
      case "JSFlow":
      case "ProjectFoxhound": {
        const uncaughtSyntaxErrors = (
          executions: ExecutionDetail[]
        ): Set<string> => {
          return new Set(
            executions
              .flatMap((execution) => execution.uncaughtErrors)
              .filter((error) => error.includes("SyntaxError"))
          );
        };
        return (
          subtractSets(
            uncaughtSyntaxErrors(toolExecutions),
            uncaughtSyntaxErrors(originalExecutions)
          ).size > 0
        );
      }
      case "JEST":
      case "IFTranspiler":
      case "GIFC":
      case "Jalangi":
      case "Linvail":
        return toolExecutions.some(
          (execution) => execution.transformErrors.length > 0
        );
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  })();
  return {
    syntacticallyCompatible,
    eventuallyCompatible,
    loadingCompleteness: eventuallyCompatible
      ? getLoadingCompletenessInfo(originalExecutions, toolExecutions)
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
