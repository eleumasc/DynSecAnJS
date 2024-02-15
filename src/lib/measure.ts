import { ExecutionAnalysisResult, ExecutionDetail } from "./ExecutionAnalysis";
import FeatureSet from "./FeatureSet";
import { Fallible, isFailure, isSuccess } from "./util/Fallible";
import { avg, stdev } from "./util/math";

export const measure = (
  fallibleResult: Fallible<ExecutionAnalysisResult>
): string[] => {
  if (!isSuccess(fallibleResult)) {
    return [`GENERAL failure: ${fallibleResult.reason}`];
  }

  const {
    originalExecutions: fallibleOriginalExecutions,
    toolExecutions: fallibleToolExecutions,
  } = fallibleResult.val;

  if (!fallibleOriginalExecutions.every(isSuccess)) {
    return [
      `ORIG failure: ${fallibleOriginalExecutions.find(isFailure)?.reason}`,
    ];
  }
  if (!fallibleToolExecutions.every(isSuccess)) {
    return [`TOOL failure: ${fallibleToolExecutions.find(isFailure)?.reason}`];
  }

  const getPredominantFeatureSet = (
    featureSets: FeatureSet[],
    threshold: number
  ): FeatureSet | null => {
    const eqClasses: FeatureSet[][] = [];
    for (const featureSet of featureSets) {
      const eqClass = eqClasses.find((eqClass) =>
        eqClass[0].equals(featureSet)
      );
      if (eqClass) {
        eqClass.push(featureSet);
      } else {
        eqClasses.push([featureSet]);
      }
    }
    return (
      eqClasses.find((eqClass) => eqClass.length >= threshold)?.[0] ?? null
    );
  };

  const originalExecutions = fallibleOriginalExecutions
    .map((successExecution) => successExecution.val)
    .filter((execution) => execution.loadingCompleted);
  const toolExecutions = fallibleToolExecutions
    .map((successExecution) => successExecution.val)
    .filter((execution) => execution.loadingCompleted);

  const THRESHOLD = 3;
  const measureTransparency = (
    originalExecutions: ExecutionDetail[],
    toolExecutions: ExecutionDetail[]
  ): string => {
    const originalFeatureSet = getPredominantFeatureSet(
      originalExecutions.map((execution) => execution.featureSet),
      THRESHOLD
    );
    const toolFeatureSet = getPredominantFeatureSet(
      toolExecutions.map((execution) => execution.featureSet),
      THRESHOLD
    );

    if (!originalFeatureSet || !toolFeatureSet) {
      return (
        "NO-PRED" +
        (!originalFeatureSet ? "-ORIG" : "") +
        (!toolFeatureSet ? "-TOOL" : "")
      );
    }

    if (originalFeatureSet.equals(toolFeatureSet)) {
      return "TRANSPARENT";
    } else {
      const broken = originalFeatureSet.broken(toolFeatureSet);
      return "NON-transparent: " + JSON.stringify([...broken]);
    }
  };

  const measurePerformance = (executions: ExecutionDetail[]): string => {
    const avgExecutionTimeMs = avg(
      executions.map((execution) => execution.executionTimeMs)
    );
    const stdevExecutionTimeMs = stdev(
      executions.map((execution) => execution.executionTimeMs)
    );
    return `${avgExecutionTimeMs} ± ${stdevExecutionTimeMs.toFixed(3)} (${
      executions.length
    })`;
  };

  return [
    measureTransparency(originalExecutions, toolExecutions),
    measurePerformance(originalExecutions),
    measurePerformance(toolExecutions),
  ];
};
