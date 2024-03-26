import { Fallible } from "../core/Fallible";

export interface Analysis<RunOptions, AnalysisResult> {
  run(runOptions: RunOptions): Promise<Fallible<AnalysisResult>>;
  terminate(): Promise<void>;
}
