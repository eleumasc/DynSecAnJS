import assert from "assert";
import {
  AnalysisResult,
  everySuccessAnalysisResult,
  mapFeatureSets,
} from "./AnalysisResult";
import FeatureSet from "./FeatureSet";

export const assessTransparency = (
  regularResults: AnalysisResult[],
  toolResults: AnalysisResult[]
): string => {
  if (
    !everySuccessAnalysisResult(regularResults) ||
    !everySuccessAnalysisResult(toolResults)
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

  const regularCombinedFeatureSet = computeCombinedFeatureSet(
    mapFeatureSets(regularResults)
  );
  const toolCombinedFeatureSet = computeCombinedFeatureSet(
    mapFeatureSets(toolResults)
  );

  if (regularCombinedFeatureSet.equals(toolCombinedFeatureSet)) {
    return "TRANSPARENT";
  } else {
    const broken = regularCombinedFeatureSet.broken(toolCombinedFeatureSet);
    return "NON-transparent: " + JSON.stringify([...broken]);
  }
};
