import ArchiveReader from "./ArchiveReader";
import {
  OriginalAnalysisResult,
  deserializeOriginalAnalysisResult,
} from "./OriginalAnalysis";
import {
  ToolAnalysisResult,
  deserializeToolAnalysisResult,
} from "./ToolAnalysis";
import { ExecutionDetail } from "./ExecutionDetail";
import FeatureSet from "./FeatureSet";
import { Fallible, isSuccess, isFailure } from "./util/Fallible";
import { avg, stdev } from "./util/math";

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
    const toolLogfile = toolArchive.load(site);
    tableRows.push([site, ...measure(originalLogfile.data, toolLogfile.data)]);
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
    val: { compatible, toolExecutions: fallibleToolExecutions },
  } = fallibleToolResult;

  if (!compatible) {
    return ["NON-COMPATIBLE"];
  }

  if (!fallibleOriginalExecutions.every(isSuccess)) {
    return [
      `ORIG failure: ${fallibleOriginalExecutions.find(isFailure)?.reason}`,
    ];
  }
  if (!fallibleToolExecutions.every(isSuccess)) {
    return [`TOOL failure: ${fallibleToolExecutions.find(isFailure)?.reason}`];
  }

  const getPredominantFeatureSet = (
    featureSets: FeatureSet[],
    threshold: number
  ): FeatureSet | null => {
    const eqClasses: FeatureSet[][] = [];
    for (const featureSet of featureSets) {
      const eqClass = eqClasses.find((eqClass) =>
        eqClass[0].equals(featureSet)
      );
      if (eqClass) {
        eqClass.push(featureSet);
      } else {
        eqClasses.push([featureSet]);
      }
    }
    return (
      eqClasses.find((eqClass) => eqClass.length >= threshold)?.[0] ?? null
    );
  };

  const originalExecutions = fallibleOriginalExecutions
    .map((successExecution) => successExecution.val)
    .filter((execution) => execution.loadingCompleted);
  const toolExecutions = fallibleToolExecutions
    .map((successExecution) => successExecution.val)
    .filter((execution) => execution.loadingCompleted);

  const THRESHOLD = 3;
  const measureTransparency = (
    originalExecutions: ExecutionDetail[],
    toolExecutions: ExecutionDetail[]
  ): string => {
    const originalFeatureSet = getPredominantFeatureSet(
      originalExecutions.map((execution) => execution.featureSet),
      THRESHOLD
    );
    const toolFeatureSet = getPredominantFeatureSet(
      toolExecutions.map((execution) => execution.featureSet),
      THRESHOLD
    );

    if (!originalFeatureSet || !toolFeatureSet) {
      return (
        "NO-PRED" +
        (!originalFeatureSet ? "-ORIG" : "") +
        (!toolFeatureSet ? "-TOOL" : "")
      );
    }

    if (originalFeatureSet.equals(toolFeatureSet)) {
      return "TRANSPARENT";
    } else {
      const broken = originalFeatureSet.broken(toolFeatureSet);
      return "NON-TRANSPARENT: " + JSON.stringify([...broken]);
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
