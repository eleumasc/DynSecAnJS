import { Analysis, AnalysisFactory } from "./Analysis";
import {
  AnalysisResult,
  AnalysisResultData,
  deserializeAnalysisResult,
  serializeAnalysisResult,
} from "./AnalysisResult";
import { Logfile, LogfileRecord, LogfileRecordData } from "./Logfile";
import { AnalysisRunner, MeasurementRunner } from "./Session";
import { assessTransparency } from "./assessTransparency";
import { AbstractSession } from "./AbstractSession";

export interface AssessmentLogfileRecordData extends LogfileRecordData {
  type: "AssessmentLogfileRecord";
  regularResults: AnalysisResultData[];
  toolResults: AnalysisResultData[];
}

export class AssessmentLogfileRecord implements LogfileRecord {
  constructor(
    readonly regularResults: AnalysisResult[],
    readonly toolResults: AnalysisResult[]
  ) {}

  serialize(): AssessmentLogfileRecordData {
    return {
      type: "AssessmentLogfileRecord",
      regularResults: this.regularResults.map((result) =>
        serializeAnalysisResult(result)
      ),
      toolResults: this.toolResults.map((result) =>
        serializeAnalysisResult(result)
      ),
    };
  }

  static deserialize(
    data: AssessmentLogfileRecordData
  ): AssessmentLogfileRecord {
    const { regularResults, toolResults } = data;
    return new AssessmentLogfileRecord(
      regularResults.map((result) => deserializeAnalysisResult(result)),
      toolResults.map((result) => deserializeAnalysisResult(result))
    );
  }
}

export interface AssessmentSessionOptions {
  analysisRepeat: number;
}

export class AssessmentAnalysisRunner
  implements AnalysisRunner<AssessmentLogfileRecord>
{
  constructor(
    readonly regularAnalysis: Analysis,
    readonly toolAnalysis: Analysis,
    readonly options: AssessmentSessionOptions
  ) {}

  async runAnalysis(
    url: string,
    label: string
  ): Promise<AssessmentLogfileRecord> {
    const { analysisRepeat } = this.options;

    let regularResults: AnalysisResult[] = [];
    let toolResults: AnalysisResult[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const regularResult = await this.regularAnalysis.run(
        url,
        `${label}.r${i}`
      );
      regularResults = [...regularResults, regularResult];
      if (regularResult.status === "failure") {
        break;
      }
      const toolResult = await this.toolAnalysis.run(url, `${label}.t${i}`);
      toolResults = [...toolResults, toolResult];
      if (toolResult.status === "failure") {
        break;
      }
    }
    return new AssessmentLogfileRecord(regularResults, toolResults);
  }

  async terminate(): Promise<void> {
    await this.regularAnalysis.terminate();
    await this.toolAnalysis.terminate();
  }
}

export class AssessmentMeasurementRunner
  implements MeasurementRunner<AssessmentLogfileRecord>
{
  rows: string[][] = [];

  async runMeasurement(
    record: AssessmentLogfileRecord,
    logfile: Logfile
  ): Promise<void> {
    this.rows = [
      ...this.rows,
      [
        logfile.site,
        assessTransparency(record.regularResults, record.toolResults),
      ],
    ];
  }

  async report(): Promise<void> {
    console.table(this.rows);
  }
}

export class AssessmentSession extends AbstractSession<AssessmentLogfileRecord> {
  constructor(
    readonly regularAnalysisFactory: AnalysisFactory,
    readonly toolAnalysisFactory: AnalysisFactory,
    readonly options: AssessmentSessionOptions
  ) {
    super();
  }

  async setupAnalysis(): Promise<AnalysisRunner<AssessmentLogfileRecord>> {
    return new AssessmentAnalysisRunner(
      await this.regularAnalysisFactory.call(null),
      await this.toolAnalysisFactory.call(null),
      this.options
    );
  }

  async setupMeasurement(): Promise<
    MeasurementRunner<AssessmentLogfileRecord>
  > {
    return new AssessmentMeasurementRunner();
  }
}
