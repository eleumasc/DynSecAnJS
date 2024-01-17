import { DefaultFeatureSet } from "./DefaultFeatureSet";

export interface GatheringReport {
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledNativeMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
}

export interface FeatureSet {
  equals(that: FeatureSet): boolean;
  toJsonSerializable(): any;
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
