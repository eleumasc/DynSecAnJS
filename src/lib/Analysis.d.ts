import { AnalysisResult } from "./AnalysisResult";

export interface Analysis {
  run(url: string): Promise<AnalysisResult>;
  terminate(): Promise<void>;
}

export type AnalysisFactory = () => Promise<Analysis>;
