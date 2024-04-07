import { Fallible } from "../core/Fallible";

export interface Analysis {}

export interface RunnableAnalysis<RunOptions, AnalysisResult> extends Analysis {
  run(runOptions: RunOptions): Promise<Fallible<AnalysisResult>>;
}
