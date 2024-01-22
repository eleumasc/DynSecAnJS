import { AnalysisResult, Logfile } from "./Analysis";
import { DefaultFeatureSet } from "./DefaultFeatureSet";
import { FeatureSet } from "./FeatureSet";

interface BaseAnalysisResultData {
  status: string;
}

interface SuccessAnalysisResultData extends BaseAnalysisResultData {
  status: "success";
  pageUrl: string;
  featureSet: any;
}

interface FailureAnalysisResultData extends BaseAnalysisResultData {
  status: "failure";
  reason: string;
}

type AnalysisResultData = SuccessAnalysisResultData | FailureAnalysisResultData;

export interface LogfileData {
  site: string;
  analysisResults: AnalysisResultData[];
}

export const serializeLogfile = (concrete: Logfile): LogfileData => {
  const { site, analysisResults } = concrete;
  return {
    site,
    analysisResults: analysisResults.map((analysisResult) =>
      serializeAnalysisResult(analysisResult)
    ),
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

const serializeFeatureSet = (concrete: FeatureSet): any => {
  return concrete.toData();
};

export const deserializeLogfile = (data: LogfileData): Logfile => {
  const { site, analysisResults } = data;
  return {
    site,
    analysisResults: analysisResults.map((analysisResult) =>
      deserializeAnalysisResult(analysisResult)
    ),
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

const deserializeFeatureSet = (data: any): FeatureSet => {
  return DefaultFeatureSet.fromData(data);
};
