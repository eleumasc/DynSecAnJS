import FeatureSet from "./FeatureSet";

export interface BaseAnalysisResult {
  status: string;
}

export interface SuccessAnalysisResult extends BaseAnalysisResult {
  status: "success";
  pageUrl: string;
  featureSet: FeatureSet;
}

export interface FailureAnalysisResult extends BaseAnalysisResult {
  status: "failure";
  reason: string;
}

export type AnalysisResult = SuccessAnalysisResult | FailureAnalysisResult;

export interface BaseAnalysisResultData {
  status: string;
}

export interface SuccessAnalysisResultData extends BaseAnalysisResultData {
  status: "success";
  pageUrl: string;
  featureSet: any;
}

export interface FailureAnalysisResultData extends BaseAnalysisResultData {
  status: "failure";
  reason: string;
}

export type AnalysisResultData =
  | SuccessAnalysisResultData
  | FailureAnalysisResultData;

export const serializeAnalysisResult = (
  concrete: AnalysisResult
): AnalysisResultData => {
  const { status } = concrete;
  if (status === "success") {
    const { pageUrl, featureSet } = concrete;
    return {
      status,
      pageUrl,
      featureSet: featureSet.serialize(),
    };
  } else {
    const { reason } = concrete;
    return {
      status,
      reason,
    };
  }
};

export const deserializeAnalysisResult = (
  data: AnalysisResultData
): AnalysisResult => {
  const { status } = data;
  if (status === "success") {
    const { pageUrl, featureSet } = data;
    return {
      status,
      pageUrl,
      featureSet: FeatureSet.deserialize(featureSet),
    };
  } else if (status === "failure") {
    const { reason } = data;
    return {
      status,
      reason,
    };
  } else {
    throw new Error(`Invalid status of AnalysisResult: ${status}`);
  }
};
