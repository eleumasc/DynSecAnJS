import { Fallible } from "../core/Fallible";

export interface Analysis {
  terminate(): Promise<void>;
}

export interface RunnableAnalysis<RunOptions, AnalysisResult> extends Analysis {
  run(runOptions: RunOptions): Promise<Fallible<AnalysisResult>>;
}
