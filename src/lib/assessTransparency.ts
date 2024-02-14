import assert from "assert";
import {
  ExecutionAnalysisResult,
  mapSuccessExecutionsToFeatureSets,
} from "./ExecutionAnalysis";
import FeatureSet from "./FeatureSet";
import { Fallible, isSuccess } from "./util/Fallible";

export const assessTransparency = (
  fallibleResult: Fallible<ExecutionAnalysisResult>
): string => {
  if (!isSuccess(fallibleResult)) {
    return "failure";
  }

  const { originalExecutions, toolExecutions } = fallibleResult.val;

  if (
    !originalExecutions.every(isSuccess) ||
    !toolExecutions.every(isSuccess)
  ) {
    return "failure";
  }

  const computeCombinedFeatureSet = (featureSets: FeatureSet[]) => {
    const result = featureSets.reduce(
      (acc: FeatureSet | null, cur: FeatureSet) =>
        acc ? acc.intersect(cur) : cur,
      null
    );
    assert(result !== null);
    return result;
  };

  const originalCombinedFeatureSet = computeCombinedFeatureSet(
    mapSuccessExecutionsToFeatureSets(originalExecutions)
  );
  const toolCombinedFeatureSet = computeCombinedFeatureSet(
    mapSuccessExecutionsToFeatureSets(toolExecutions)
  );

  if (originalCombinedFeatureSet.equals(toolCombinedFeatureSet)) {
    return "TRANSPARENT";
  } else {
    const broken = originalCombinedFeatureSet.broken(toolCombinedFeatureSet);
    return "NON-transparent: " + JSON.stringify([...broken]);
  }
};
