import {
  ExecutionAnalysisResult,
  ExecutionDetail,
  RunOptions,
} from "./ExecutionAnalysis";
import { Fallible, isFailure } from "./util/Fallible";
import { Agent } from "./Agent";
import { ExecutionAnalysis } from "./ExecutionAnalysis";
import {
  JavaScriptVersion,
  lessOrEqualToJavaScriptVersion,
} from "./compatibility/JavaScriptVersion";
import { PrefixAttachmentList, FileAttachment } from "./Archive";

export interface Options {
  supportedJavaScriptVersion: JavaScriptVersion;
  analysisRepeat: number;
}

export class DefaultExecutionAnalysis implements ExecutionAnalysis {
  constructor(
    readonly originalAgent: Agent,
    readonly toolAgent: Agent,
    readonly options: Options
  ) {}

  async run(
    runOptions: RunOptions
  ): Promise<Fallible<ExecutionAnalysisResult>> {
    const { supportedJavaScriptVersion, analysisRepeat } = this.options;
    const {
      site,
      minimumJavaScriptVersion: siteMinimumJavaScriptVersion,
      // wprArchivePath,
      attachmentList,
    } = runOptions;

    if (
      !lessOrEqualToJavaScriptVersion(
        siteMinimumJavaScriptVersion,
        supportedJavaScriptVersion
      )
    ) {
      throw new Error(`This tool does not support this site`);
    }

    const url = `http://${site}/`;

    // TODO: remove and get wprArchivePath from runOptions
    const wprArchiveAttachment = FileAttachment.create();
    attachmentList.add("archive.wprgo", wprArchiveAttachment);
    const wprArchivePath = wprArchiveAttachment.getTempPath();
    const recordExecution = await this.originalAgent.run({
      url,
      wprArchivePath,
      wprOperation: "record", // TODO: remove this option
    });
    if (isFailure(recordExecution)) {
      return recordExecution;
    }

    let originalExecutions: Fallible<ExecutionDetail>[] = [];
    let toolExecutions: Fallible<ExecutionDetail>[] = [];
    for (let i = 0; i < analysisRepeat; i += 1) {
      const originalExecution = await this.originalAgent.run({
        url,
        wprArchivePath,
        attachmentList: new PrefixAttachmentList(attachmentList, `r${i}`),
      });
      originalExecutions.push(originalExecution);
      if (isFailure(originalExecution)) {
        break;
      }

      const toolExecution = await this.toolAgent.run({
        url,
        wprArchivePath,
        attachmentList: new PrefixAttachmentList(attachmentList, `t${i}-`),
      });
      toolExecutions.push(toolExecution);
      if (isFailure(toolExecution)) {
        break;
      }
    }

    return {
      status: "success",
      val: {
        originalExecutions,
        toolExecutions,
      },
    };
  }

  async terminate(): Promise<void> {
    await Promise.all([
      this.originalAgent.terminate(),
      this.toolAgent.terminate(),
    ]);
  }
}
