import { Fallible, isFailure, isSuccess } from "../core/Fallible";
import {
  OriginalAnalysisResult,
  deserializeOriginalAnalysisResult,
} from "../lib/OriginalAnalysis";
import {
  ToolAnalysisResult,
  deserializeToolAnalysisResult,
} from "../lib/ToolAnalysis";
import { avg, stdev } from "../core/math";
import {
  brokenExecutionTraces,
  createExecutionTrace,
  findPredominantExecutionTrace,
} from "../lib/ExecutionTrace";

import ArchiveReader from "../lib/ArchiveReader";
import { ExecutionDetail } from "../lib/ExecutionDetail";

export interface TransparencyArgs {
  originalArchivePath: string;
  toolArchivePath: string;
}

export const startTransparency = async (args: TransparencyArgs) => {
  const { originalArchivePath, toolArchivePath } = args;

  const originalArchive = new ArchiveReader(
    originalArchivePath,
    "original-analysis",
    deserializeOriginalAnalysisResult
  );
  const originalSitelist = originalArchive.getSitelist();
  const toolArchive = new ArchiveReader(
    toolArchivePath,
    "tool-analysis",
    deserializeToolAnalysisResult
  );
  const toolSitelist = toolArchive.getSitelist();

  const tableRows: string[][] = [];
  for (const site of originalSitelist) {
    if (!toolSitelist.includes(site)) {
      continue;
    }
    const originalLogfile = originalArchive.load(site);
    // const toolLogfile = toolArchive.load(site);
    // tableRows.push([site, ...measure(originalLogfile.data, toolLogfile.data)]);

    let toolLogfile = null;
    try {
      toolLogfile = toolArchive.load(site);
    } catch (e) {}
    if (toolLogfile !== null) {
      tableRows.push([
        site,
        ...measure(originalLogfile.data, toolLogfile.data),
      ]);
    }
  }

  console.table(tableRows);
};

export const measure = (
  fallibleOriginalResult: Fallible<OriginalAnalysisResult>,
  fallibleToolResult: Fallible<ToolAnalysisResult>
): string[] => {
  if (!isSuccess(fallibleOriginalResult)) {
    return [`GENERAL ORIG failure: ${fallibleOriginalResult.reason}`];
  }
  if (!isSuccess(fallibleToolResult)) {
    return [`GENERAL TOOL failure: ${fallibleToolResult.reason}`];
  }

  const {
    val: { originalExecutions: fallibleOriginalExecutions },
  } = fallibleOriginalResult;
  const {
    val: { toolName, toolExecutions: fallibleToolExecutions },
  } = fallibleToolResult;

  // if (!compatible) {
  //   return ["NON-COMPATIBLE"];
  // }

  if (!fallibleOriginalExecutions.every(isSuccess)) {
    return [
      `ORIG failure: ${fallibleOriginalExecutions.find(isFailure)?.reason}`,
    ];
  }
  if (!fallibleToolExecutions.every(isSuccess)) {
    return [`TOOL failure: ${fallibleToolExecutions.find(isFailure)?.reason}`];
  }

  const originalExecutions = fallibleOriginalExecutions
    .map((successExecution) => successExecution.val)
    .filter((execution) => execution.loadingCompleted);
  const toolExecutions = fallibleToolExecutions
    .map((successExecution) => successExecution.val)
    .filter((execution) => execution.loadingCompleted);

  const isEventuallyCompatible = (): boolean => {
    return false; // TODO: implement

    // switch (toolName) {
    //   case 'Jalangi':
    //     ...
    // }
  };
  if (!isEventuallyCompatible()) {
    return ["NON-COMPATIBLE"];
  }

  const THRESHOLD = 3;
  const measureTransparency = (
    originalExecutions: ExecutionDetail[],
    toolExecutions: ExecutionDetail[]
  ): string => {
    const originalExecutionTrace = findPredominantExecutionTrace(
      originalExecutions.map((execution) => createExecutionTrace(execution)),
      THRESHOLD
    );
    const toolExecutionTrace = findPredominantExecutionTrace(
      toolExecutions.map((execution) => createExecutionTrace(execution)),
      THRESHOLD
    );

    if (!originalExecutionTrace || !toolExecutionTrace) {
      return (
        "NO-PRED" +
        (!originalExecutionTrace ? "-ORIG" : "") +
        (!toolExecutionTrace ? "-TOOL" : "")
      );
    }

    const brokenFeatures = brokenExecutionTraces(
      originalExecutionTrace,
      toolExecutionTrace
    );
    if (brokenFeatures.size === 0) {
      return "TRANSPARENT";
    } else {
      return "NON-TRANSPARENT: " + JSON.stringify([...brokenFeatures]);
    }
  };

  const measurePerformance = (executions: ExecutionDetail[]): string => {
    const avgExecutionTimeMs = avg(
      executions.map((execution) => execution.executionTimeMs)
    );
    const stdevExecutionTimeMs = stdev(
      executions.map((execution) => execution.executionTimeMs)
    );
    return `${avgExecutionTimeMs} ± ${stdevExecutionTimeMs.toFixed(3)} (${
      executions.length
    })`;
  };

  return [
    measureTransparency(originalExecutions, toolExecutions),
    measurePerformance(originalExecutions),
    measurePerformance(toolExecutions),
  ];
};
