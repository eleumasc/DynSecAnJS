import { CompatibilityInfo } from "./SiteInfo";
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

const isIncompatible = (compatibilityInfo: CompatibilityInfo): boolean =>
  compatibilityInfo.eventuallyCompatible === false;

const isUsingFeature =
  (feature: string) =>
  (compatibilityInfo: CompatibilityInfo): boolean =>
    compatibilityInfo.features.includes(feature);

export const executeIncompatibilityAnalysis = (
  compatibilityInfoArray: CompatibilityInfo[]
): IncompatibilityAnalysisResult => {
  const probIncompatible =
    compatibilityInfoArray.filter(isIncompatible).length /
    compatibilityInfoArray.length;

  const analyze = (
    feature: string,
    usingFeatureFn: (compatibilityInfo: CompatibilityInfo) => boolean
  ) => {
    const featureInfoArray = compatibilityInfoArray.filter(
      (compatibilityInfo) => usingFeatureFn(compatibilityInfo)
    );
    const probFeature = featureInfoArray.length / compatibilityInfoArray.length;
    const probGivenFeature =
      featureInfoArray.filter(isIncompatible).length / featureInfoArray.length;

    const notFeatureInfoArray = compatibilityInfoArray.filter(
      (compatibilityInfo) => !usingFeatureFn(compatibilityInfo)
    );
    const probNotFeature =
      notFeatureInfoArray.length / compatibilityInfoArray.length;
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
      compatibilityInfoArray.flatMap((info) => info.features)
    ).map((feature) => analyze(feature, isUsingFeature(feature))),
    analyze(
      "ES5",
      (compatibilityInfo) => compatibilityInfo.features.length === 0
    ),
  ];

  return {
    probIncompatible,
    features,
  };
};
