import FeatureSet from "./FeatureSet";

export interface ExecutionDetail {
  actuallyCompatible: boolean;
  transformLogs: string[];
  pageUrl: string;
  screenshotFile?: string;
  featureSet: FeatureSet;
  loadingCompleted: boolean;
  executionTimeMs: number;
}

export const serializeExecutionDetail = (cooked: ExecutionDetail): any => {
  const { featureSet, ...rest } = cooked;
  return { ...rest, featureSet: featureSet.serialize() };
};

export const deserializeExecutionDetail = (raw: any): ExecutionDetail => {
  const { featureSet, ...rest } = raw;
  return { ...rest, featureSet: FeatureSet.deserialize(featureSet) };
};
