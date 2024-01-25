import { Analysis } from "./Analysis";
import {
  AnalysisResult,
  AnalysisResultData,
  deserializeAnalysisResult,
  serializeAnalysisResult,
} from "./AnalysisResult";
import { Logfile, LogfileRecord, LogfileRecordData } from "./Logfile";
import { AnalysisFactory } from "./Analysis";
import { AnalysisRunner, MeasurementRunner, Session } from "./Session";
import { assessRobustness } from "./assessRobustness";
import { AbstractSession } from "./AbstractSession";

export interface TestLogfileRecordData extends LogfileRecordData {
  type: "TestLogfileRecord";
  results: AnalysisResultData[];
}

export class TestLogfileRecord implements LogfileRecord {
  constructor(readonly results: AnalysisResult[]) {}

  serialize(): LogfileRecordData {
    return <TestLogfileRecordData>{
      type: "TestLogfileRecord",
      results: this.results.map((result) => serializeAnalysisResult(result)),
    };
  }

  static deserialize(data: TestLogfileRecordData): TestLogfileRecord {
    const { results } = data;
    return new TestLogfileRecord(
      results.map((result) => deserializeAnalysisResult(result))
    );
  }
}

export class TestAnalysisRunner implements AnalysisRunner<TestLogfileRecord> {
  constructor(readonly analysis: Analysis, readonly repeat: number) {}

  async runAnalysis(url: string): Promise<TestLogfileRecord> {
    let results: AnalysisResult[] = [];
    for (let i = 0; i < this.repeat; i += 1) {
      results = [...results, await this.analysis.run(url)];
    }
    return new TestLogfileRecord(results);
  }

  async terminate(): Promise<void> {
    await this.analysis.terminate();
  }
}

export class TestMeasurementRunner
  implements MeasurementRunner<TestLogfileRecord>
{
  rows: string[][] = [];

  async runMeasurement(
    record: TestLogfileRecord,
    logfile: Logfile
  ): Promise<void> {
    this.rows = [
      ...this.rows,
      [logfile.site, assessRobustness(record.results)],
    ];
  }

  async report(): Promise<void> {
    console.table(this.rows);
  }
}

export class TestSession extends AbstractSession<TestLogfileRecord> {
  constructor(
    readonly analysisFactory: AnalysisFactory,
    readonly analysisRepeat: number
  ) {
    super();
  }

  async setupAnalysis(): Promise<AnalysisRunner<TestLogfileRecord>> {
    return new TestAnalysisRunner(
      await this.analysisFactory.call(null),
      this.analysisRepeat
    );
  }

  async setupMeasurement(): Promise<MeasurementRunner<TestLogfileRecord>> {
    return new TestMeasurementRunner();
  }
}
