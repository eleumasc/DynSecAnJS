import {
  ExecutionTrace,
  brokenExecutionTraces,
  createExecutionTrace,
  findPredominantExecutionTrace,
  subtractExecutionTraces,
} from "./ExecutionTrace";
import { Fallible, Success, isSuccess } from "../core/Fallible";
import { avg, stdev } from "../core/math";

import { ExecutionDetail } from "../lib/ExecutionDetail";
import { OriginalAnalysisResult } from "../lib/OriginalAnalysis";
import { ToolAnalysisResult } from "../lib/ToolAnalysis";
import assert from "assert";
import { findErrorTypes } from "./findErrorTypes";
import { isToolAnalysisOk } from "./isToolAnalysisOk";

export interface SiteInfo {
  site: string;
  accessible: boolean; // no general failure in original
  compatibility: CompatibilityInfo | null; // non-null if accessible is true
}

// note: at this point, we expect no general failure in tool
export interface CompatibilityInfo {
  syntacticallyCompatible: boolean;
  analyzable: boolean; // no execution failure in tool for at least one (the first) execution
  eventuallyCompatible: boolean | null; // null if compatibility is unknown, i.e., toolAnalysisOk but not loadingCompleted
  transpilationOK: boolean; // true if there is no babel error when transpilation is required
  transpilationKO: boolean; // true if there is some babel error when transpilation is required
  originalSomeSuccessSomeFailure: boolean;
  toolSomeSuccessSomeFailure: boolean;
  transparencyAnalyzable: boolean; // no execution failure in both original and tool, for all executions
  predominantTraceExistance: PredominantTraceExistanceInfo | null; // non-null if transparencyAnalyzable is true
}

export interface PredominantTraceExistanceInfo {
  originalTraceExists: boolean;
  toolTraceExists: boolean;
  transparency: TransparencyInfo | null; // non-null if both originalPredominantTraceExists and toolPredominantTraceExists are true
}

export interface TransparencyInfo {
  transparent: boolean;
  brokenFeatures: string[];
  diffTrace: ExecutionTrace;
  uncaughtErrorTypes: Set<string>; // for motivating/giving further insights about non-transparency
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
  return {
    site,
    accessible,
    compatibility: accessible
      ? getCompatibilityInfo(fallibleOriginalResult.val, fallibleToolResult)
      : null,
  };
};

export const getCompatibilityInfo = (
  originalResult: OriginalAnalysisResult,
  fallibleToolResult: Fallible<ToolAnalysisResult>
): CompatibilityInfo => {
  assert(isSuccess(fallibleToolResult));

  const { val: toolResult } = fallibleToolResult;
  const {
    toolName,
    compatible: syntacticallyCompatible,
    toolExecutions: fallibleToolExecutions,
  } = toolResult;

  const findFirstExecution = (
    fallibleExecutions: Fallible<ExecutionDetail>[]
  ): ExecutionDetail | null => {
    const executions = fallibleExecutions
      .filter(isSuccess)
      .map(({ val }) => val);
    return executions.length > 0
      ? executions.find(({ loadingCompleted }) => loadingCompleted) ??
          executions[0]
      : null;
  };
  const toolFirstExecution = findFirstExecution(fallibleToolExecutions);

  const analyzable = toolFirstExecution !== null;
  const eventuallyCompatible =
    analyzable && isToolAnalysisOk(toolName, toolFirstExecution)
      ? toolFirstExecution.loadingCompleted
        ? true
        : null
      : false;

  const isCompletelyLoaded = (
    execution: Fallible<ExecutionDetail>
  ): execution is Success<ExecutionDetail> =>
    isSuccess(execution) && execution.val.loadingCompleted;
  const isNotCompletelyLoaded = (
    execution: Fallible<ExecutionDetail>
  ): boolean => !isCompletelyLoaded(execution);
  const { originalExecutions: fallibleOriginalExecutions } = originalResult;
  const transparencyAnalyzable =
    eventuallyCompatible === true &&
    fallibleOriginalExecutions.every(isCompletelyLoaded) &&
    fallibleToolExecutions.every(isCompletelyLoaded);

  const transpilationRequired = !syntacticallyCompatible && analyzable;
  const babelErrorFound = (execution: ExecutionDetail): boolean =>
    execution.transformErrors.some(
      (transformError) => transformError.transformName === "Babel"
    );

  return {
    syntacticallyCompatible,
    analyzable,
    eventuallyCompatible,
    transpilationOK:
      transpilationRequired && !babelErrorFound(toolFirstExecution),
    transpilationKO:
      transpilationRequired && babelErrorFound(toolFirstExecution),
    originalSomeSuccessSomeFailure:
      eventuallyCompatible === true &&
      fallibleOriginalExecutions.some(isCompletelyLoaded) &&
      fallibleOriginalExecutions.some(isNotCompletelyLoaded),
    toolSomeSuccessSomeFailure:
      eventuallyCompatible === true &&
      fallibleToolExecutions.some(isCompletelyLoaded) &&
      fallibleToolExecutions.some(isNotCompletelyLoaded),
    transparencyAnalyzable,
    predominantTraceExistance: transparencyAnalyzable
      ? getPredominantTraceExistanceInfo(
          fallibleOriginalExecutions.map(({ val }) => val),
          fallibleToolExecutions.map(({ val }) => val)
        )
      : null,
  };
};

export const getPredominantTraceExistanceInfo = (
  originalExecutions: ExecutionDetail[],
  toolExecutions: ExecutionDetail[]
): PredominantTraceExistanceInfo => {
  const EXPECTED_EXECUTIONS_COUNT = 5;
  const MAJORITY_VOTING_THRESHOLD = 3;

  assert(originalExecutions.length === EXPECTED_EXECUTIONS_COUNT);
  assert(toolExecutions.length === EXPECTED_EXECUTIONS_COUNT);

  const originalTrace = findPredominantExecutionTrace(
    originalExecutions.map((execution) => createExecutionTrace(execution)),
    MAJORITY_VOTING_THRESHOLD
  );
  const toolTrace = findPredominantExecutionTrace(
    toolExecutions.map((execution) => createExecutionTrace(execution)),
    MAJORITY_VOTING_THRESHOLD
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
  const diffTrace = subtractExecutionTraces(toolTrace, originalTrace);
  const uncaughtErrorTypes = findErrorTypes([...diffTrace.uncaughtErrors]);
  return {
    transparent,
    brokenFeatures: [...brokenFeatures],
    diffTrace,
    uncaughtErrorTypes,
    performance: transparent
      ? getPerformanceInfo(originalExecutions, toolExecutions)
      : null,
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
