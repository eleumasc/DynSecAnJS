import FeatureSet from "./FeatureSet";
import { LogfileAttachment } from "./LogfileAttachment";

export interface BaseAnalysisResult {
  status: string;
  screenshot?: LogfileAttachment;
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
  screenshot?: LogfileAttachment;
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
  const { status, screenshot } = concrete;
  if (status === "success") {
    const { pageUrl, featureSet } = concrete;
    return {
      status,
      screenshot,
      pageUrl,
      featureSet: featureSet.serialize(),
    };
  } else {
    const { reason } = concrete;
    return {
      status,
      screenshot,
      reason,
    };
  }
};

export const deserializeAnalysisResult = (
  data: AnalysisResultData
): AnalysisResult => {
  const { status, screenshot } = data;
  if (status === "success") {
    const { pageUrl, featureSet } = data;
    return {
      status,
      screenshot,
      pageUrl,
      featureSet: FeatureSet.deserialize(featureSet),
    };
  } else if (status === "failure") {
    const { reason } = data;
    return {
      status,
      screenshot,
      reason,
    };
  } else {
    throw new Error(`Invalid status of AnalysisResult: ${status}`);
  }
};

export const everySuccessAnalysisResult = (
  results: AnalysisResult[]
): results is SuccessAnalysisResult[] =>
  results.every(
    (result): result is SuccessAnalysisResult => result.status === "success"
  );

export const mapFeatureSets = (
  results: SuccessAnalysisResult[]
): FeatureSet[] => results.map(({ featureSet }) => featureSet);
