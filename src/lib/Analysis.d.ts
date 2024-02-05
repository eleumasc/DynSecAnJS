import { AnalysisResult } from "./AnalysisResult";

export interface AnalysisRunOptions {
  label: string;
  httpForwardHost?: string;
  httpsForwardHost?: string;
}

export interface Analysis {
  run(url: string, options: AnalysisRunOptions): Promise<AnalysisResult>;
  terminate(): Promise<void>;
}

export type AnalysisFactory = () => Promise<Analysis>;
