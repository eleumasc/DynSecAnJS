import _ from "lodash";
import assert from "assert";
import { avg, stdev } from "../util/math";
import { classifyJSErrors, JSError } from "../measurement/TransparencyIssue";
import { CollectReport, RunDetail } from "../archive/CollectArchive";
import { Flow, uniqFlow } from "../measurement/flow/Flow";
import { getToolFlows } from "./flow/ToolFlows";
import { isFailure } from "../util/Completion";
import { isSyntacticallyCompatible } from "../collection/isSyntacticallyCompatible";
import { SiteResult } from "../archive/Archive";
import { Syntax, SyntaxScript } from "../syntax/Syntax";
import { ToolName } from "../collection/ToolName";
import {
  ExecutionTrace,
  findPredominantExecutionTrace,
  isEqualExecutionTrace,
} from "../measurement/ExecutionTrace";
import {
  CompatibilityIssue,
  findParseOrAnalysisError,
} from "../measurement/CompatibilityIssue";

export type ToolSiteReport = {
  site: string;
  scripts: SyntaxScript[];
  syntacticallyCompatibleScripts: SyntaxScript[];
  eventuallyCompatibleScripts: SyntaxScript[] | null;
  errorScripts: SyntaxScript[] | null;
  parseErrorScripts: SyntaxScript[] | null;
  analysisErrorScripts: SyntaxScript[] | null;
  compatibilityIssue?: CompatibilityIssue;
  unclassifiedTransformErrors?: string[];
  flows: Flow[];
} & ToolSiteReportTransparencyPart;

type ToolSiteReportTransparencyPart =
  | {
      transparencyAnalyzable: false;
      executionTraceNotFound?: true;
    }
  | ({
      transparencyAnalyzable: true;
    } & (
      | {
          transparent: false;
          jsErrors: JSError[];
        }
      | {
          transparent: true;
          performanceData: ToolSiteReportPerformanceData | null;
        }
    ));

export interface ToolSiteReportPerformanceData {
  browserExecutionTimeAvg: number;
  browserExecutionTimeStdev: number;
  toolExecutionTimeAvg: number;
  toolExecutionTimeStdev: number;
}

export const getToolSiteReport = (
  site: string,
  syntax: Syntax,
  toolName: ToolName,
  toolSiteResult: SiteResult<CollectReport>,
  browserSiteResult: SiteResult<CollectReport>
): ToolSiteReport => {
  // Compatibility & Security

  const scripts = syntax.scripts;
  const syntacticallyCompatibleScripts = scripts.filter((script) =>
    isSyntacticallyCompatible(toolName, script.minimumESVersion)
  );

  let initialBase = {
    site,
    scripts,
    syntacticallyCompatibleScripts,
    eventuallyCompatibleScripts: [] as SyntaxScript[],
    errorScripts: [] as SyntaxScript[],
    parseErrorScripts: [] as SyntaxScript[],
    analysisErrorScripts: [] as SyntaxScript[],
    flows: [] as Flow[],
    transparencyAnalyzable: false as false,
  };

  const unknownBase = {
    eventuallyCompatibleScripts: null,
    errorScripts: null,
    parseErrorScripts: null,
    analysisErrorScripts: null,
  };

  if (isFailure(toolSiteResult)) {
    const { error } = toolSiteResult;
    if (typeof error === "object" && error.type === "TranspileError") {
      return {
        ...initialBase,
        compatibilityIssue: CompatibilityIssue.TranspileError,
      };
    } else {
      return {
        ...initialBase,
        compatibilityIssue: CompatibilityIssue.CrashError,
      };
    }
  }

  const { value: toolReport } = toolSiteResult;

  if (toolReport.crashRawFlows) {
    const crashFlows = toolReport.crashRawFlows.flatMap((rawFlows) =>
      getToolFlows(site, toolName, rawFlows)
    );

    initialBase = {
      ...initialBase,
      flows: uniqFlow([...initialBase.flows, ...crashFlows]),
    };
  }

  if (isFailure(toolReport.runsCompletion)) {
    if (toolReport.runsCompletion.error.type === "TimeoutError") {
      // Evaluation timeout
      return {
        ...initialBase,
        ...unknownBase,
      };
    }

    return {
      ...initialBase,
      compatibilityIssue: CompatibilityIssue.CrashError,
    };
  }

  const tryGetScriptByScriptIds = (scriptIds: number[]): SyntaxScript[] => {
    return scriptIds.flatMap((scriptId) => {
      const script = scripts.find((script) => script.id === scriptId);
      return script ? [script] : [];
    });
  };
  const errorScriptIds = _.uniq(
    toolReport.scriptTransformLogs.flatMap((logRecord) => logRecord.scriptIds)
  );
  const errorScripts = tryGetScriptByScriptIds(errorScriptIds);
  const eventuallyCompatibleScripts = _.difference(scripts, errorScripts);

  const parseErrorScriptIds: number[] = [];
  const analysisErrorScriptIds: number[] = [];
  const unclassifiedTransformErrors: string[] = [];
  for (const logRecord of toolReport.scriptTransformLogs) {
    const involvedScriptIds = logRecord.scriptIds;
    const errorMessage = logRecord.error.message;
    const compatibilityIssue = findParseOrAnalysisError(toolName, [
      errorMessage,
    ]);
    if (compatibilityIssue === CompatibilityIssue.ParseError) {
      parseErrorScriptIds.push(...involvedScriptIds);
    } else if (compatibilityIssue === CompatibilityIssue.AnalysisError) {
      analysisErrorScriptIds.push(...involvedScriptIds);
    } else {
      unclassifiedTransformErrors.push(errorMessage);
    }
  }
  const parseErrorScripts = tryGetScriptByScriptIds(
    _.uniq(parseErrorScriptIds)
  );
  const analysisErrorScripts = tryGetScriptByScriptIds(
    _.uniq(analysisErrorScriptIds)
  );

  const { value: toolRunDetails } = toolReport.runsCompletion;

  const toolFlows = toolRunDetails.flatMap((runDetail) =>
    getToolFlows(site, toolName, runDetail.monitorState.rawFlows)
  );

  const compatibilityBase = {
    ...initialBase,
    eventuallyCompatibleScripts,
    errorScripts,
    parseErrorScripts,
    analysisErrorScripts,
    flows: uniqFlow([...initialBase.flows, ...toolFlows]),
  };

  if (
    !toolRunDetails.some((runDetail) => runDetail.monitorState.loadingCompleted)
  ) {
    return {
      ...compatibilityBase,
      ...unknownBase,
    };
  }

  // Transparency

  const transparencyBase = {
    ...compatibilityBase,
  };

  // Rationale: if a tool is unable to transform any script of a given website,
  // the transformed website is exactly like the original one. Since we want to
  // understand the transparency of analysis in websites that tools can analyze
  // in some measure, we discard from transparency evaluation those websites
  // which the tool is completely unable to analyze.
  if (eventuallyCompatibleScripts.length === 0) {
    return { ...transparencyBase };
  }

  if (isFailure(browserSiteResult)) {
    return {
      ...transparencyBase,
    };
  }

  const { value: browserReport } = browserSiteResult;

  if (isFailure(browserReport.runsCompletion)) {
    return {
      ...transparencyBase,
    };
  }

  const { value: browserRunDetails } = browserReport.runsCompletion;

  const findExecutionTrace = (runDetails: RunDetail[]): ExecutionTrace | null =>
    findPredominantExecutionTrace(
      runDetails
        .filter((runDetail) => runDetail.monitorState.loadingCompleted)
        .map((runDetail): ExecutionTrace => {
          const { uncaughtErrors } = runDetail.monitorState;
          return {
            uncaughtErrors: new Set(uncaughtErrors),
          };
        })
    );
  const toolExecutionTrace = findExecutionTrace(toolRunDetails);
  const browserExecutionTrace = findExecutionTrace(browserRunDetails);

  if (!toolExecutionTrace || !browserExecutionTrace) {
    return {
      ...transparencyBase,
      executionTraceNotFound: true,
    };
  }

  const transparent = isEqualExecutionTrace(
    toolExecutionTrace,
    browserExecutionTrace
  );

  if (!transparent) {
    return {
      ...transparencyBase,
      transparencyAnalyzable: true,
      transparent,
      jsErrors: classifyJSErrors([...toolExecutionTrace.uncaughtErrors]),
    };
  }

  // Performance

  const performanceBase = {
    ...transparencyBase,
    transparencyAnalyzable: true as true,
    transparent,
  };

  if (eventuallyCompatibleScripts.length !== scripts.length) {
    return {
      ...performanceBase,
      performanceData: null,
    };
  }

  const browserExecutionTimes = browserRunDetails.map(
    (runDetail) => runDetail.executionTime
  );
  const toolExecutionTimes = toolRunDetails.map(
    (runDetail) => runDetail.executionTime
  );
  const browserExecutionTimeAvg = avg(browserExecutionTimes);
  const browserExecutionTimeStdev = stdev(browserExecutionTimes);
  const toolExecutionTimeAvg = avg(toolExecutionTimes);
  const toolExecutionTimeStdev = stdev(toolExecutionTimes);

  return {
    ...performanceBase,
    performanceData: {
      browserExecutionTimeAvg,
      browserExecutionTimeStdev,
      toolExecutionTimeAvg,
      toolExecutionTimeStdev,
    },
  };
};
