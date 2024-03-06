import { RunOptions, ToolAnalysis, ToolAnalysisResult } from "./ToolAnalysis";
import { ExecutionDetail } from "./ExecutionDetail";
import { Fallible, isFailure } from "./util/Fallible";
import { Agent } from "./Agent";
import { ESVersion, lessOrEqualToESVersion } from "./compatibility/ESVersion";
import { PrefixAttachmentList } from "./ArchiveWriter";
import { defaultAnalysisDelayMs, defaultLoadingTimeoutMs } from "./defaults";
import { RunOptions as AgentRunOptions } from "./Agent";

export interface Options {
  supportedESVersion: ESVersion;
  analysisRepeat: number;
}

export class DefaultToolAnalysis implements ToolAnalysis {
  constructor(
    readonly toolAgent: Agent<ExecutionDetail>,
    readonly toolCompatAgent: Agent<ExecutionDetail>,
    readonly options: Options
  ) {}

  async run(runOptions: RunOptions): Promise<Fallible<ToolAnalysisResult>> {
    const { supportedESVersion, analysisRepeat } = this.options;
    const {
      site,
      minimumESVersion: siteMinimumESVersion,
      wprArchivePath,
      timeSeedMs,
      attachmentList,
    } = runOptions;

    const compatible = lessOrEqualToESVersion(
      siteMinimumESVersion,
      supportedESVersion
    );

    const url = `http://${site}/`;

    let toolExecutions: Fallible<ExecutionDetail>[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const runOptions = <AgentRunOptions>{
        url,
        wprOptions: { operation: "replay", archivePath: wprArchivePath },
        loadingTimeoutMs: defaultLoadingTimeoutMs,
        timeSeedMs,
        waitUntil: "load",
        analysisDelayMs: defaultAnalysisDelayMs,
        attachmentList: new PrefixAttachmentList(attachmentList, `t${i}-`),
      };
      const toolExecution = compatible
        ? await this.toolAgent.run(runOptions)
        : await this.toolCompatAgent.run(runOptions);

      toolExecutions.push(toolExecution);
      if (isFailure(toolExecution)) {
        break;
      }
    }

    return {
      status: "success",
      val: { compatible, toolExecutions },
    };
  }

  async terminate(): Promise<void> {
    await this.toolAgent.terminate();
  }
}
