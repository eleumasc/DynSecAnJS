import { CompatibilityInfo, ScriptCompatibilityDetail } from "./SiteInfo";

import { distinctArray } from "../core/Array";

export interface IncompatibilityAnalysisResult {
  probIncompatible: number;
  features: {
    feature: string;
    probFeature: number;
    probGivenFeature: number;
    probNotFeature: number;
    probGivenNotFeature: number;
  }[];
}

const isIncompatible = (
  scriptCompatibility: ScriptCompatibilityDetail
): boolean => !scriptCompatibility.compatible;

const isUsingFeature =
  (feature: string) =>
  (scriptCompatibility: ScriptCompatibilityDetail): boolean =>
    scriptCompatibility.features.includes(feature);

export const executeIncompatibilityAnalysis = (
  compatibilityInfoArray: CompatibilityInfo[]
): IncompatibilityAnalysisResult => {
  const scriptCompatibilityDetails = compatibilityInfoArray.flatMap(
    (compatibility) => compatibility.scriptCompatibilityDetails
  );

  const probIncompatible =
    scriptCompatibilityDetails.filter(isIncompatible).length /
    scriptCompatibilityDetails.length;

  const analyze = (
    feature: string,
    usingFeatureFn: (scriptCompatibility: ScriptCompatibilityDetail) => boolean
  ) => {
    const featureInfoArray = scriptCompatibilityDetails.filter(
      (scriptCompatibility) => usingFeatureFn(scriptCompatibility)
    );
    const probFeature =
      featureInfoArray.length / scriptCompatibilityDetails.length;
    const probGivenFeature =
      featureInfoArray.filter(isIncompatible).length / featureInfoArray.length;

    const notFeatureInfoArray = scriptCompatibilityDetails.filter(
      (scriptCompatibility) => !usingFeatureFn(scriptCompatibility)
    );
    const probNotFeature =
      notFeatureInfoArray.length / scriptCompatibilityDetails.length;
    const probGivenNotFeature =
      notFeatureInfoArray.filter(isIncompatible).length /
      notFeatureInfoArray.length;

    return {
      feature,
      probFeature,
      probGivenFeature,
      probNotFeature,
      probGivenNotFeature,
    };
  };

  const features = [
    ...distinctArray(
      scriptCompatibilityDetails.flatMap((info) => info.features)
    ).map((feature) => analyze(feature, isUsingFeature(feature))),
    analyze(
      "ES5",
      (scriptCompatibility) => scriptCompatibility.features.length === 0
    ),
  ];

  return {
    probIncompatible,
    features,
  };
};

export const createIncompatibilityCSV = (
  compatibilityInfoArray: CompatibilityInfo[]
): string => {
  const scriptCompatibilityDetails = compatibilityInfoArray.flatMap(
    (compatibility) => compatibility.scriptCompatibilityDetails
  );

  const features = distinctArray(
    scriptCompatibilityDetails.flatMap((info) => info.features)
  );
  const rows = [
    ["INCOMPATIBLE", ...features],
    ...scriptCompatibilityDetails.map((scriptCompatibility) => {
      return [
        Number(isIncompatible(scriptCompatibility)),
        ...features.map((feature) =>
          Number(isUsingFeature(feature)(scriptCompatibility))
        ),
      ];
    }),
  ];
  return rows.map((row) => row.join(",")).join("\n");
};
