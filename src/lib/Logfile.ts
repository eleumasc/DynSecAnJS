import {
  ExecutionAnalysisResult,
  deserializeExecutionAnalysisResult,
  serializeExecutionAnalysisResult,
} from "./ExecutionAnalysis";
import {
  Fallible,
  deserializeFallible,
  serializeFallible,
} from "./util/Fallible";

export interface Logfile {
  site: string;
  kind: string;
  result: Fallible<ExecutionAnalysisResult>;
}

export const serializeLogfile = (concrete: Logfile): any => {
  const { result, ...rest } = concrete;
  return {
    ...rest,
    result: serializeFallible(result, serializeExecutionAnalysisResult),
  };
};

export const deserializeLogfile = (data: any): Logfile => {
  const { result, ...rest } = data;
  return {
    ...rest,
    result: deserializeFallible(result, deserializeExecutionAnalysisResult),
  };
};
