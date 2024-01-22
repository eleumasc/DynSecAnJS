import { FeatureSet } from "./FeatureSet";

export interface Analysis {
  run(url: string): Promise<AnalysisResult>;
  terminate(): Promise<void>;
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

export type AnalysisResult = SuccessAnalysisResult | FailureAnalysisResult;export interface Logfile {
  site: string;
  analysisResults: AnalysisResult[];
}

