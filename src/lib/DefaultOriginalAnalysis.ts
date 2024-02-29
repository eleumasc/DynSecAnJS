import { ExecutionDetail } from "./ExecutionDetail";
import { Fallible, isFailure } from "./util/Fallible";
import { Agent } from "./Agent";
import { PrefixAttachmentList, FileAttachment } from "./ArchiveWriter";
import {
  OriginalAnalysis,
  OriginalAnalysisResult,
  RunOptions,
} from "./OriginalAnalysis";
import { CompatibilityDetail } from "./compatibility/CompatibilityDetail";
import { defaultAnalysisDelayMs, defaultLoadingTimeoutMs } from "./defaults";

export interface Options {
  analysisRepeat: number;
}

export class DefaultOriginalAnalysis implements OriginalAnalysis {
  constructor(
    readonly compatibilityAgent: Agent<CompatibilityDetail>,
    readonly originalAgent: Agent<ExecutionDetail>,
    readonly options: Options
  ) {}

  async run(runOptions: RunOptions): Promise<Fallible<OriginalAnalysisResult>> {
    const { analysisRepeat } = this.options;
    const { site, attachmentList } = runOptions;

    const url = `http://${site}/`;

    const wprArchiveAttachment = FileAttachment.create();
    attachmentList.add("archive.wprgo", wprArchiveAttachment);
    const wprArchivePath = wprArchiveAttachment.getTempPath();
    const timeSeedMs = Date.now();
    const compatibility = await this.compatibilityAgent.run({
      url,
      wprOptions: { operation: "record", archivePath: wprArchivePath },
      loadingTimeoutMs: defaultLoadingTimeoutMs,
      timeSeedMs,
      waitUntil: "load",
      analysisDelayMs: defaultAnalysisDelayMs,
    });
    if (isFailure(compatibility)) {
      return compatibility;
    }

    let originalExecutions: Fallible<ExecutionDetail>[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const originalExecution = await this.originalAgent.run({
        url,
        wprOptions: { operation: "replay", archivePath: wprArchivePath },
        loadingTimeoutMs: defaultLoadingTimeoutMs,
        timeSeedMs,
        waitUntil: "domcontentloaded",
        analysisDelayMs: defaultAnalysisDelayMs,
        attachmentList: new PrefixAttachmentList(attachmentList, `r${i}`),
      });
      originalExecutions.push(originalExecution);
      if (isFailure(originalExecution)) {
        break;
      }
    }

    return {
      status: "success",
      val: {
        compatibility: compatibility.val,
        wprArchivePath,
        timeSeedMs,
        originalExecutions,
      },
    };
  }

  async terminate(): Promise<void> {
    await Promise.all([
      this.compatibilityAgent.terminate(),
      this.originalAgent.terminate(),
    ]);
  }
}
