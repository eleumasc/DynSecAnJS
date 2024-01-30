import { Logfile, LogfileRecord } from "./Logfile";

export interface Session<T extends LogfileRecord> {
  setupAnalysis(): Promise<AnalysisRunner<T>>;
  setupMeasurement(): Promise<MeasurementRunner<T>>;
}

export interface AnalysisRunner<T extends LogfileRecord> {
  runAnalysis(url: string, label: string): Promise<T>;
  terminate(): Promise<void>;
}

export interface MeasurementRunner<T extends LogfileRecord> {
  runMeasurement(record: T, logfile: Logfile): Promise<void>;
  report(): Promise<void>;
}
