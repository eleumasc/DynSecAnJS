import { AbstractSession } from "./AbstractSession";
import { LogfileRecord } from "./Logfile";
import { AnalysisRunner, Session } from "./Session";
import { defaultAnalysisTimeoutMs } from "./config/options";
import { timeBomb } from "./util/async";

export default class TimedAnalysisSession<
  T extends LogfileRecord
> extends AbstractSession<T> {
  constructor(readonly session: Session<T>) {
    super();
  }

  async setupAnalysis(): Promise<AnalysisRunner<T>> {
    return new TimedAnalysisRunner(this.session);
  }

  static from<T extends LogfileRecord>(session: Session<T>) {
    return new TimedAnalysisSession<T>(session);
  }
}

export class TimedAnalysisRunner<T extends LogfileRecord>
  implements AnalysisRunner<T>
{
  protected runner: AnalysisRunner<T> | null = null;

  constructor(readonly session: Session<T>) {}

  async runAnalysis(url: string, label: string): Promise<T> {
    const attemptRun = async () => {
      if (this.runner === null) {
        this.runner = await this.session.setupAnalysis();
      }
      const { runner } = this;
      try {
        return await timeBomb(
          runner.runAnalysis(url, label),
          defaultAnalysisTimeoutMs
        );
      } catch (e) {
        console.log("ANALYSIS TIMEOUT!"); // TODO: debug
        await runner.terminate();
        this.runner = null;
        throw e;
      }
    };

    try {
      return await attemptRun();
    } catch {
      return await attemptRun();
    }
  }

  async terminate(): Promise<void> {
    const { runner } = this;
    this.runner = null;
    await runner?.terminate();
  }
}
