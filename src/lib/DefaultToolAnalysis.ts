import { RunOptions, ToolAnalysis, ToolAnalysisResult } from "./ToolAnalysis";
import { ExecutionDetail } from "./ExecutionDetail";
import { Fallible, isFailure } from "./util/Fallible";
import { Agent } from "./Agent";
import { ESVersion, lessOrEqualToESVersions } from "./compatibility/ESVersion";
import { PrefixAttachmentList } from "./ArchiveWriter";
import { defaultAnalysisDelayMs, defaultLoadingTimeoutMs } from "./defaults";

export interface Options {
  supportedESVersion: ESVersion;
  analysisRepeat: number;
}

export class DefaultToolAnalysis implements ToolAnalysis {
  constructor(
    readonly toolAgent: Agent<ExecutionDetail>,
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

    if (!lessOrEqualToESVersions(siteMinimumESVersion, supportedESVersion)) {
      return {
        status: "success",
        val: { compatible: false, toolExecutions: [] },
      };
    }

    const url = `http://${site}/`;

    let toolExecutions: Fallible<ExecutionDetail>[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const toolExecution = await this.toolAgent.run({
        url,
        wprOptions: { operation: "replay", archivePath: wprArchivePath },
        timeSeedMs,
        loadingTimeoutMs: defaultLoadingTimeoutMs,
        analysisDelayMs: defaultAnalysisDelayMs,
        attachmentList: new PrefixAttachmentList(attachmentList, `t${i}-`),
      });
      toolExecutions.push(toolExecution);
      if (isFailure(toolExecution)) {
        break;
      }
    }

    return {
      status: "success",
      val: { compatible: true, toolExecutions },
    };
  }

  async terminate(): Promise<void> {
    await this.toolAgent.terminate();
  }
}
