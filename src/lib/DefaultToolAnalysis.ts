import { ESVersion, lessOrEqualToESVersion } from "../compatibility/ESVersion";
import { Fallible, isFailure } from "../core/Fallible";
import { RunOptions, ToolAnalysis, ToolAnalysisResult } from "./ToolAnalysis";
import { defaultDelayMs, defaultLoadingTimeoutMs } from "../core/defaults";

import { Agent } from "./Agent";
import { ExecutionDetail } from "./ExecutionDetail";
import { ExecutionHooksProvider } from "./ExecutionHooks";
import { PrefixAttachmentList } from "./ArchiveWriter";
import { runExecutionAnalysis } from "./runExecutionAnalysis";

export interface Options {
  toolName: string;
  executionHooksProvider: ExecutionHooksProvider;
  supportedESVersion: ESVersion;
  analysisRepeat: number;
}

export class DefaultToolAnalysis implements ToolAnalysis {
  constructor(readonly agent: Agent, readonly options: Options) {}

  async run(runOptions: RunOptions): Promise<Fallible<ToolAnalysisResult>> {
    const {
      toolName,
      executionHooksProvider,
      supportedESVersion,
      analysisRepeat,
    } = this.options;
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
    const compatMode = !compatible;

    const url = `http://${site}/`;

    let executions: Fallible<ExecutionDetail>[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const execution = await runExecutionAnalysis({
        url,
        agent: this.agent,
        hooksProvider: executionHooksProvider,
        compatMode,
        monitorConfig: {
          waitUntil: "load",
          loadingTimeoutMs: defaultLoadingTimeoutMs,
          timeSeedMs,
        },
        wprOptions: {
          operation: "replay",
          archivePath: wprArchivePath,
        },
        delayMs: defaultDelayMs,
        attachmentList: new PrefixAttachmentList(attachmentList, `t${i}`),
      });
      executions.push(execution);
      if (isFailure(execution)) {
        break;
      }
    }

    return {
      status: "success",
      val: { toolName, compatible, toolExecutions: executions },
    };
  }

  async terminate(): Promise<void> {
    await this.agent.terminate();
  }
}
