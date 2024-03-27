import { Fallible, isFailure } from "../core/Fallible";
import {
  OriginalAnalysis,
  OriginalAnalysisResult,
  RunOptions,
} from "./OriginalAnalysis";

import { Agent } from "./Agent";
import { CompatibilityHooksProvider } from "./CompatibilityHooks";
import { ExecutionDetail } from "./ExecutionDetail";
import { ExecutionHooksProvider } from "./ExecutionHooks";
import { FileAttachment } from "./ArchiveWriter";
import { defaultDelayMs } from "../core/defaults";
import { runCompatibilityAnalysis } from "./runCompatibilityAnalysis";
import { runExecutionAnalysis } from "./runExecutionAnalysis";

export interface Options {
  compatibilityHooksProvider: CompatibilityHooksProvider;
  executionHooksProvider: ExecutionHooksProvider;
  analysisRepeat: number;
  loadingTimeoutMs: number;
}

export class DefaultOriginalAnalysis implements OriginalAnalysis {
  constructor(readonly agent: Agent, readonly options: Options) {}

  async run(runOptions: RunOptions): Promise<Fallible<OriginalAnalysisResult>> {
    const {
      compatibilityHooksProvider,
      executionHooksProvider,
      analysisRepeat,
      loadingTimeoutMs,
    } = this.options;
    const { site, attachmentList } = runOptions;

    const url = `http://${site}/`;

    const wprArchiveAttachment = FileAttachment.create();
    const wprArchiveFile = attachmentList.add(
      "archive.wprgo",
      wprArchiveAttachment
    );
    const wprArchivePath = wprArchiveAttachment.getTempPath();
    const timeSeedMs = Date.now();

    const compatibility = await runCompatibilityAnalysis({
      url,
      agent: this.agent,
      hooksProvider: compatibilityHooksProvider,
      monitorConfig: {
        waitUntil: "load",
        loadingTimeoutMs,
        timeSeedMs,
      },
      wprOptions: {
        operation: "record",
        archivePath: wprArchivePath,
      },
      delayMs: defaultDelayMs,
    });
    if (isFailure(compatibility)) {
      return compatibility;
    }

    let executions: Fallible<ExecutionDetail>[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const execution = await runExecutionAnalysis({
        url,
        agent: this.agent,
        hooksProvider: executionHooksProvider,
        compatMode: false,
        monitorConfig: {
          waitUntil: "load",
          loadingTimeoutMs,
          timeSeedMs,
        },
        wprOptions: {
          operation: "replay",
          archivePath: wprArchivePath,
        },
        delayMs: defaultDelayMs,
        // attachmentList: new PrefixAttachmentList(attachmentList, `r${i}`),
      });
      executions.push(execution);
      if (isFailure(execution)) {
        break;
      }
    }

    return {
      status: "success",
      val: {
        compatibility: compatibility.val,
        wprArchiveFile: wprArchiveFile,
        timeSeedMs,
        originalExecutions: executions,
      },
    };
  }

  async terminate(): Promise<void> {
    await this.agent.terminate();
  }
}
