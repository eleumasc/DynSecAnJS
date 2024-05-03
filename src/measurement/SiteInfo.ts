import { ExecutionDetail, TransformErrorDetail } from "../lib/ExecutionDetail";
import {
  ExecutionTrace,
  brokenExecutionTraces,
  createExecutionTrace,
  findPredominantExecutionTrace,
  subtractExecutionTraces,
} from "./ExecutionTrace";
import { Fallible, Success, isSuccess } from "../core/Fallible";

import { OriginalAnalysisResult } from "../lib/OriginalAnalysis";
import { ToolAnalysisResult } from "../lib/ToolAnalysis";
import assert from "assert";
import { findCompatibilityIssues } from "./findCompatibilityIssues";
import { findErrorTypes } from "./findErrorTypes";
import { isToolAnalysisOk } from "./isToolAnalysisOk";

export interface SiteInfo {
  site: string;
  accessible: boolean; // no general failure in original and the site uses JavaScript
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
  transparencyAnalyzable: boolean;
  issues: Set<string>; // for motivating/giving further insights about non-compatibility
  transparency: TransparencyInfo | null; // non-null if transparencyAnalyzable is true
}

export interface TransparencyInfo {
  transparent: boolean;
  brokenFeatures: string[];
  diffTrace: ExecutionTrace;
  uncaughtErrorTypes: Set<string>; // for motivating/giving further insights about non-transparency
  performance: PerformanceInfo | null; // non-null if transparent is true
}

export interface PerformanceInfo {
  originalExecutionTimes: number[];
  toolExecutionTimes: number[];
}

export const getSiteInfo = (
  site: string,
  fallibleOriginalResult: Fallible<OriginalAnalysisResult>,
  fallibleToolResult: Fallible<ToolAnalysisResult>
): SiteInfo => {
  const accessible =
    isSuccess(fallibleOriginalResult) &&
    fallibleOriginalResult.val.compatibility.scripts.length > 0;
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

  const transpilationRequired = !syntacticallyCompatible && analyzable;
  const babelErrorFound = (execution: ExecutionDetail): boolean =>
    execution.transformErrors.some(
      (transformError) => transformError.transformName === "Babel"
    );

  const baseResult = {
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
    issues: findCompatibilityIssues(
      toolFirstExecution?.transformErrors ?? null,
      toolName
    ),
  };

  if (
    eventuallyCompatible === true &&
    fallibleOriginalExecutions.every(isCompletelyLoaded) &&
    fallibleToolExecutions.every(isCompletelyLoaded)
  ) {
    const originalExecutions = fallibleOriginalExecutions.map(({ val }) => val);
    const toolExecutions = fallibleToolExecutions.map(({ val }) => val);

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

    if (bothTracesExist) {
      return {
        ...baseResult,
        transparencyAnalyzable: true,
        transparency: getTransparencyInfo(
          originalTrace,
          toolTrace,
          originalExecutions,
          toolExecutions
        ),
      };
    }
  }

  return {
    ...baseResult,
    transparencyAnalyzable: false,
    transparency: null,
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
) => {
  const getExecutionTimes = (executions: ExecutionDetail[]): number[] =>
    executions.map((execution) => execution.executionTimeMs);
  return {
    originalExecutionTimes: getExecutionTimes(originalExecutions),
    toolExecutionTimes: getExecutionTimes(toolExecutions),
  };
};
