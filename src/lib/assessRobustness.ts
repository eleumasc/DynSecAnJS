import { intersectArrays } from "./util/array";
import { AnalysisResult, SuccessAnalysisResult } from "./AnalysisResult";

export const assessRobustness = (results: AnalysisResult[]): string => {
  if (
    !results.every(
      (result): result is SuccessAnalysisResult => result.status === "success"
    )
  ) {
    return "failure";
  }

  if (
    results.some((x, i) =>
      results.slice(i + 1).some((y) => x.featureSet.equals(y.featureSet))
    )
  ) {
    return "ROBUST";
  } else {
    const commonBroken = results
      .flatMap((x, i) =>
        results.slice(i + 1).map((y) => x.featureSet.broken(y.featureSet))
      )
      .reduce((acc: string[] | null, cur: string[]): string[] => {
        if (!acc) {
          return cur;
        }
        return intersectArrays(acc, cur);
      }, null);
    return "NON-robust: " + JSON.stringify(commonBroken);
  }
};
