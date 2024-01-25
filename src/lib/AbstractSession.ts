import { LogfileRecord } from "./Logfile";
import { AnalysisRunner, MeasurementRunner, Session } from "./Session";

export class AbstractSession<T extends LogfileRecord> implements Session<T> {
  setupAnalysis(): Promise<AnalysisRunner<T>> {
    throw new Error("Method not implemented.");
  }

  setupMeasurement(): Promise<MeasurementRunner<T>> {
    throw new Error("Method not implemented.");
  }
}
