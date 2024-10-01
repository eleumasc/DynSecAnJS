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
  syntacticallyCompatible: boolean;
  eventuallyCompatibleTotal: number;
  eventuallyCompatibleCount: number | null;
  errorScripts: SyntaxScript[] | null;
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
      | ({
          transparent: true;
        } & ToolSiteReportPerformancePart)
    ));

type ToolSiteReportPerformancePart = {
  browserExecutionTimeAvg: number;
  browserExecutionTimeStdev: number;
  toolExecutionTimeAvg: number;
  toolExecutionTimeStdev: number;
  overhead: number;
};

export const getToolSiteReport = (
  site: string,
  syntax: Syntax,
  toolName: ToolName,
  toolSiteResult: SiteResult<CollectReport>,
  browserSiteResult: SiteResult<CollectReport>
): ToolSiteReport => {
  // Compatibility & Security

  const eventuallyCompatibleTotal = syntax.scripts.length;
  const badCompatibilityBase = {
    site,
    // TODO: implement syntacticallyCompatible* similarly to eventuallyCompatible*
    syntacticallyCompatible: isSyntacticallyCompatible(
      toolName,
      syntax.minimumESVersion
    ),
    eventuallyCompatibleTotal,
    eventuallyCompatibleCount: 0,
    errorScripts: [] as SyntaxScript[],
    flows: [] as Flow[],
    transparencyAnalyzable: false as false,
  };

  if (isFailure(toolSiteResult)) {
    const { error } = toolSiteResult;
    if (typeof error === "object" && error.type === "TranspileError") {
      return {
        ...badCompatibilityBase,
        compatibilityIssue: CompatibilityIssue.TranspileError,
      };
    } else {
      return {
        ...badCompatibilityBase,
        compatibilityIssue: CompatibilityIssue.CrashError,
      };
    }
  }

  const { value: toolReport } = toolSiteResult;

  if (isFailure(toolReport.runsCompletion)) {
    return {
      ...badCompatibilityBase,
      compatibilityIssue: CompatibilityIssue.CrashError,
    };
  }

  const errorScriptIds = _.uniq(
    toolReport.scriptTransformLogs.flatMap((logRecord) => logRecord.scriptIds)
  );
  const errorScripts = errorScriptIds.map((scriptId) => {
    const script = syntax.scripts.find((script) => script.id === scriptId);
    assert(script);
    return script;
  });
  const eventuallyCompatibleCount = syntax.scripts.length - errorScripts.length;

  const { value: toolRunDetails } = toolReport.runsCompletion;

  const flows = uniqFlow(
    toolRunDetails.flatMap((runDetail) =>
      getToolFlows(site, toolName, runDetail.monitorState.rawFlows)
    )
  );

  let transformErrorsDetail = null;
  const transformErrors = toolReport.scriptTransformLogs.flatMap(
    (logRecord) => logRecord.error.message
  );
  if (transformErrors.length > 0) {
    const compatibilityIssue = findParseOrAnalysisError(
      toolName,
      transformErrors
    );
    if (compatibilityIssue) {
      transformErrorsDetail = {
        compatibilityIssue,
      };
    } else {
      transformErrorsDetail = {
        compatibilityIssue: CompatibilityIssue.UnknownError,
        unclassifiedTransformErrors: transformErrors,
      };
    }
  }

  const compatibilityBase = {
    ...badCompatibilityBase,
    eventuallyCompatibleCount,
    errorScripts,
    flows,
    ...transformErrorsDetail,
  };

  if (
    !toolRunDetails.some((runDetail) => runDetail.monitorState.loadingCompleted)
  ) {
    return {
      ...compatibilityBase,
      eventuallyCompatibleCount: null,
      errorScripts: null,
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
  if (eventuallyCompatibleCount === 0) {
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
  const overhead = toolExecutionTimeAvg / browserExecutionTimeAvg;

  return {
    ...performanceBase,
    browserExecutionTimeAvg,
    browserExecutionTimeStdev,
    toolExecutionTimeAvg,
    toolExecutionTimeStdev,
    overhead,
  };
};
