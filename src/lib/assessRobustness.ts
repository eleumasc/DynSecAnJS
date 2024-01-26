import assert from "assert";
import {
  AnalysisResult,
  everySuccessAnalysisResult,
  mapFeatureSets,
} from "./AnalysisResult";
import { intersectSets } from "./util/set";

export const assessRobustness = (results: AnalysisResult[]): string => {
  if (!everySuccessAnalysisResult(results)) {
    return "failure";
  }

  const featureSets = mapFeatureSets(results);

  if (
    featureSets.some((x, i) =>
      featureSets.slice(i + 1).some((y) => x.equals(y))
    )
  ) {
    return "ROBUST";
  } else {
    const commonBroken = featureSets
      .flatMap((x, i) => featureSets.slice(i + 1).map((y) => x.broken(y)))
      .reduce(
        (acc: Set<string> | null, cur: Set<string>): Set<string> =>
          acc ? intersectSets(acc, cur) : cur,
        null
      );
    assert(commonBroken !== null);
    return "NON-robust: " + JSON.stringify([...commonBroken]);
  }
};
