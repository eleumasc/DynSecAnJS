import { ESVersion, lessOrEqualToESVersion } from "../compatibility/ESVersion";
import { Fallible, isFailure, retryIfFailure } from "../core/Fallible";
import { RunOptions, ToolAnalysis, ToolAnalysisResult } from "./ToolAnalysis";

import { Agent } from "./Agent";
import { ExecutionDetail } from "./ExecutionDetail";
import { ExecutionHooksProvider } from "./ExecutionHooks";
import { defaultToleranceMs } from "../core/defaults";
import { runExecutionAnalysis } from "./runExecutionAnalysis";

export interface Options {
  toolName: string;
  executionHooksProvider: ExecutionHooksProvider;
  supportedESVersion: ESVersion;
  analysisRepeat: number;
  loadingTimeoutMs: number;
}

export class DefaultToolAnalysis implements ToolAnalysis {
  constructor(readonly agent: Agent, readonly options: Options) {}

  async run(runOptions: RunOptions): Promise<Fallible<ToolAnalysisResult>> {
    const {
      toolName,
      executionHooksProvider,
      supportedESVersion,
      analysisRepeat,
      loadingTimeoutMs,
    } = this.options;
    const {
      site,
      minimumESVersion: siteMinimumESVersion,
      wprArchivePath,
      timeSeedMs,
      // attachmentList,
    } = runOptions;

    const compatible = lessOrEqualToESVersion(
      siteMinimumESVersion,
      supportedESVersion
    );
    const compatMode = !compatible;

    const url = `http://${site}`;

    let executions: Fallible<ExecutionDetail>[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const execution = await retryIfFailure(() =>
        runExecutionAnalysis({
          url,
          agent: this.agent,
          hooksProvider: executionHooksProvider,
          compatMode,
          monitorConfig: {
            loadingTimeoutMs,
            timeSeedMs,
          },
          wprOptions: {
            operation: "replay",
            archivePath: wprArchivePath,
          },
          toleranceMs: defaultToleranceMs,
          // attachmentList: new PrefixAttachmentList(attachmentList, `t${i}`),
        })
      );
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
}
