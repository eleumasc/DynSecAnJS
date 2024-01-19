import { DefaultFeatureSet } from "./lib/DefaultFeatureSet";

export interface FeatureSet {
  equals(that: FeatureSet): boolean;
  broken(that: FeatureSet): string[];
  toData(): any;
}

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

export interface Logfile {
  site: string;
  analysisResults: AnalysisResult[];
}
