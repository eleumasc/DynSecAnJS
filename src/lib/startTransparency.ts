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
import { Fallible, isSuccess, isFailure } from "../util/Fallible";
import { avg, stdev } from "../util/math";
import { isSubsetOf } from "../util/set";

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
    val: { compatible, toolExecutions: fallibleToolExecutions },
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

  if (
    !toolExecutions.every(({ eventuallyCompatible }) => eventuallyCompatible)
  ) {
    return ["NON-COMPATIBLE"];
  }

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

    const brokenFeatures = broken(originalFeatureSet, toolFeatureSet);
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

const broken = (orig: FeatureSet, tool: FeatureSet): Set<string> => {
  const brokenSet = new Set<string>();

  if (!isSubsetOf(tool.uncaughtErrors, orig.uncaughtErrors)) {
    brokenSet.add("uncaughtErrors");
  }
  if (!isSubsetOf(tool.consoleMessages, orig.consoleMessages)) {
    brokenSet.add("consoleMessages");
  }
  // if (!equalSets(orig.calledBuiltinMethods, tool.calledBuiltinMethods)) {
  //   brokenSet.add("calledBuiltinMethods");
  // }
  if (!isSubsetOf(tool.cookieKeys, orig.cookieKeys)) {
    brokenSet.add("cookieKeys");
  }
  if (!isSubsetOf(tool.localStorageKeys, orig.localStorageKeys)) {
    brokenSet.add("localStorageKeys");
  }
  if (!isSubsetOf(tool.sessionStorageKeys, orig.sessionStorageKeys)) {
    brokenSet.add("sessionStorageKeys");
  }
  if (!isSubsetOf(tool.targetSites, orig.targetSites)) {
    brokenSet.add("targetSites");
  }
  if (!isSubsetOf(tool.includedScriptUrls, orig.includedScriptUrls)) {
    brokenSet.add("includedScriptUrls");
  }

  return brokenSet;
};

const getPredominantFeatureSet = (
  featureSets: FeatureSet[],
  threshold: number
): FeatureSet | null => {
  const eqClasses: FeatureSet[][] = [];
  for (const featureSet of featureSets) {
    const eqClass = eqClasses.find((eqClass) => eqClass[0].equals(featureSet));
    if (eqClass) {
      eqClass.push(featureSet);
    } else {
      eqClasses.push([featureSet]);
    }
  }
  return eqClasses.find((eqClass) => eqClass.length >= threshold)?.[0] ?? null;
};
