import { AnalysisResult, FeatureSet, Logfile } from "../model";
import { DefaultFeatureSet } from "./DefaultFeatureSet";

interface FeatureSetData {
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledNativeMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  targetSites: string[];
}

interface BaseAnalysisResultData {
  status: string;
}

interface SuccessAnalysisResultData extends BaseAnalysisResultData {
  status: "success";
  pageUrl: string;
  featureSet: FeatureSetData;
}

interface FailureAnalysisResultData extends BaseAnalysisResultData {
  status: "failure";
  reason: string;
}

type AnalysisResultData = SuccessAnalysisResultData | FailureAnalysisResultData;

export interface LogfileData {
  site: string;
  chromium1: AnalysisResultData;
  chromium2: AnalysisResultData;
}

export const serializeLogfile = (concrete: Logfile): LogfileData => {
  const { site, chromium1, chromium2 } = concrete;
  return {
    site,
    chromium1: serializeAnalysisResult(chromium1),
    chromium2: serializeAnalysisResult(chromium2),
  };
};

const serializeAnalysisResult = (
  concrete: AnalysisResult
): AnalysisResultData => {
  const { status } = concrete;
  if (status === "success") {
    const { pageUrl, featureSet } = concrete;
    return {
      status,
      pageUrl,
      featureSet: serializeFeatureSet(featureSet),
    };
  } else {
    const { reason } = concrete;
    return {
      status,
      reason,
    };
  }
};

const serializeFeatureSet = (concrete: FeatureSet): FeatureSetData => {
  return concrete.toData();
};

export const deserializeLogfile = (data: LogfileData): Logfile => {
  const { site, chromium1, chromium2 } = data;
  return {
    site,
    chromium1: deserializeAnalysisResult(chromium1),
    chromium2: deserializeAnalysisResult(chromium2),
  };
};

const deserializeAnalysisResult = (
  data: AnalysisResultData
): AnalysisResult => {
  const { status } = data;
  if (status === "success") {
    const { pageUrl, featureSet } = data;
    return {
      status,
      pageUrl,
      featureSet: deserializeFeatureSet(featureSet),
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

const deserializeFeatureSet = (data: FeatureSetData): FeatureSet => {
  return DefaultFeatureSet.fromData(data);
};
