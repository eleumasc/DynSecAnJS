import { Fallible } from "./util/Fallible";

export interface Analysis<RunOptions, AnalysisResult> {
  run(runOptions: RunOptions): Promise<Fallible<AnalysisResult>>;
  terminate(): Promise<void>;
}
