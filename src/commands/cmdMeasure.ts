import _ from "lodash";
import assert from "assert";
import { Args } from "../archive/Args";
import { avg, stdev } from "../util/math";
import { classifyJSErrors, JSError } from "../measurement/TransparencyIssue";
import { computeRanking, count } from "../measurement/util";
import { isFailure } from "../util/Completion";
import { isSyntacticallyCompatible } from "../collection/isSyntacticallyCompatible";
import { MeasureArchive, MeasureLogfile } from "../archive/MeasureArchive";
import { PreanalyzeArchive } from "../archive/PreanalyzeArchive";
import { SiteResult } from "../archive/Archive";
import { Syntax } from "../syntax/Syntax";
import { writeFileSync } from "fs";
import {
  QuasiFlow,
  getToolQuasiFlows,
  Flow,
  uniqFlow,
} from "../measurement/flow/Flow";
import {
  CollectArchive,
  CollectReport,
  RunDetail,
} from "../archive/CollectArchive";
import {
  ExecutionTrace,
  findPredominantExecutionTrace,
  isEqualExecutionTrace,
} from "../measurement/ExecutionTrace";
import {
  CompatibilityIssue,
  findParseOrAnalysisError,
} from "../measurement/CompatibilityIssue";
import {
  ChildInitCommandController,
  initCommand,
} from "../archive/initCommand";
import {
  getBrowserNameByToolName,
  isToolName,
  ToolName,
} from "../collection/ToolName";

export type MeasureArgs = Args<
  {
    preanalyzeArchivePath: string;
    collectArchivePaths: string[];
  },
  {}
>;

export const cmdMeasure = (args: MeasureArgs) => {
  const { archive, resolveArchivePath } = initCommand(
    args,
    MeasureArchive,
    new ChildInitCommandController(
      PreanalyzeArchive,
      (requireArgs) => requireArgs.preanalyzeArchivePath,
      () => "Measure",
      (requireArgs, { parentArchiveName, sitesState }): MeasureLogfile => {
        return {
          type: "MeasureLogfile",
          preanalyzeArchiveName: parentArchiveName,
          collectArchiveNames: requireArgs.collectArchivePaths,
          sitesState,
        };
      }
    )
  );

  const preanalyzeArchive = PreanalyzeArchive.open(
    resolveArchivePath(archive.logfile.preanalyzeArchiveName)
  );
  const collectArchives = archive.logfile.collectArchiveNames.map(
    (collectArchiveName) =>
      CollectArchive.open(resolveArchivePath(collectArchiveName))
  );

  const siteSyntaxEntries = Object.entries(
    preanalyzeArchive.logfile.sitesState
  ).flatMap(([site, isProcessed]) => {
    if (!isProcessed) {
      return [];
    }
    const siteResult = preanalyzeArchive.readSiteResult(site);
    if (isFailure(siteResult)) {
      return [];
    }
    return { site, syntax: siteResult.value };
  });

  const toolBrowserCollectArchivePairs =
    pairToolBrowserCollectArchives(collectArchives);

  // Syntax measurement

  const syntaxReport = getSyntaxReport(siteSyntaxEntries);
  console.log(syntaxReport);

  // Tool measurement

  const toolSiteReportMatrix = getToolSiteReportMatrix(
    toolBrowserCollectArchivePairs,
    siteSyntaxEntries
  );
  const toolReport = getToolReport(toolSiteReportMatrix);
  console.log(toolReport);

  archive.logfile = { ...archive.logfile, syntaxReport, toolReport };
};

type ToolBrowserCollectArchivePair = {
  toolArchive: CollectArchive;
  browserArchive: CollectArchive;
};

const pairToolBrowserCollectArchives = (
  collectArchives: CollectArchive[]
): ToolBrowserCollectArchivePair[] => {
  return collectArchives
    .filter((archive) => isToolName(archive.logfile.browserOrToolName))
    .map((toolArchive) => {
      const toolName = toolArchive.logfile.browserOrToolName as ToolName;
      const browserName = getBrowserNameByToolName(toolName);
      const browserArchive = collectArchives.find(
        (collectArchive) =>
          collectArchive.logfile.browserOrToolName === browserName
      );
      assert(
        browserArchive,
        `browserCollectArchive ${browserName} not found for toolCollectArchive ${toolName}`
      );
      return { toolArchive, browserArchive };
    });
};

type SiteSyntaxEntry = {
  site: string;
  syntax: Syntax;
};

const getSyntaxReport = (siteSyntaxEntries: SiteSyntaxEntry[]) => {
  const syntaxes = siteSyntaxEntries.map(({ syntax }) => syntax);
  const all = syntaxes.length;
  const havingScriptSyntaxes = syntaxes.filter(
    (syntax) => syntax.scripts.length > 0
  );
  const havingScript = havingScriptSyntaxes.length;
  const versionRanking = computeRanking(havingScriptSyntaxes, (syntax) => [
    syntax.minimumESVersion,
  ]);
  const featureRanking = computeRanking(havingScriptSyntaxes, (syntax) =>
    _.uniq(syntax.scripts.flatMap((script) => script.features))
  );
  return {
    all,
    havingScript,
    versionRanking,
    featureRanking,
  };
};

type ToolSiteReportMatrix = ToolSiteReportMatrixRow[];

type ToolSiteReportMatrixRow = {
  toolName: ToolName;
  toolSiteReports: ToolSiteReport[];
};

const getToolSiteReportMatrix = (
  toolBrowserCollectArchivePairs: ToolBrowserCollectArchivePair[],
  siteSyntaxEntries: SiteSyntaxEntry[]
): ToolSiteReportMatrix => {
  return toolBrowserCollectArchivePairs.map(
    ({ toolArchive, browserArchive }) => {
      const toolName = toolArchive.logfile.browserOrToolName as ToolName;
      const toolSiteReports = siteSyntaxEntries
        .filter(({ syntax }) => syntax.scripts.length > 0)
        .map(({ site, syntax }): ToolSiteReport => {
          const getSiteResult = (collectArchive: CollectArchive) =>
            collectArchive.logfile.sitesState[site]
              ? collectArchive.readSiteResult(site)
              : null;

          return getToolSiteReport(
            site,
            syntax,
            toolName,
            getSiteResult(toolArchive),
            getSiteResult(browserArchive)
          );
        });
      return { toolName, toolSiteReports };
    }
  );
};

type ToolSiteReport = {
  site: string;
  syntacticallyCompatible: boolean;
} & (
  | {
      eventuallyCompatible: false;
      compatibilityIssue: CompatibilityIssue;
      unclassifiedTransformErrors?: string[];
    }
  | ({ flows: QuasiFlow[] } & (
      | {
          eventuallyCompatible: null;
        }
      | ({
          eventuallyCompatible: true;
        } & ToolSiteReportTransparencyPart)
    ))
);

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

const getToolSiteReport = (
  site: string,
  syntax: Syntax,
  toolName: ToolName,
  toolSiteResult: SiteResult<CollectReport> | null,
  browserSiteResult: SiteResult<CollectReport> | null
): ToolSiteReport => {
  // Compatibility & Coverage

  const compatibilityBase = {
    site,
    syntacticallyCompatible: isSyntacticallyCompatible(
      toolName,
      syntax.minimumESVersion
    ),
  };

  if (!toolSiteResult) {
    return {
      ...compatibilityBase,
      eventuallyCompatible: false,
      compatibilityIssue: CompatibilityIssue.CrashError,
    };
  }

  if (isFailure(toolSiteResult)) {
    const { error } = toolSiteResult;
    if (typeof error === "object" && error.type === "TranspileError") {
      return {
        ...compatibilityBase,
        eventuallyCompatible: false,
        compatibilityIssue: CompatibilityIssue.TranspileError,
      };
    } else {
      return {
        ...compatibilityBase,
        eventuallyCompatible: false,
        compatibilityIssue: CompatibilityIssue.CrashError,
      };
    }
  }

  const toolReport = toolSiteResult.value;

  const transformErrors = toolReport.scriptTransformLogs.flatMap(
    (logRecord) => logRecord.error.message
  );
  if (transformErrors.length > 0) {
    const compatibilityIssue = findParseOrAnalysisError(
      toolName,
      transformErrors
    );
    if (compatibilityIssue) {
      return {
        ...compatibilityBase,
        eventuallyCompatible: false,
        compatibilityIssue: compatibilityIssue,
      };
    } else {
      return {
        ...compatibilityBase,
        eventuallyCompatible: false,
        compatibilityIssue: CompatibilityIssue.UnknownError,
        unclassifiedTransformErrors: transformErrors,
      };
    }
  }

  if (isFailure(toolReport.runsCompletion)) {
    return {
      ...compatibilityBase,
      eventuallyCompatible: false,
      compatibilityIssue: CompatibilityIssue.CrashError,
    };
  }

  const { value: toolRunDetails } = toolReport.runsCompletion;

  const coverageBase = {
    ...compatibilityBase,
    flows: uniqFlow(
      toolRunDetails
        .flatMap((runDetail) =>
          getToolQuasiFlows(toolName, runDetail.monitorState.rawFlows)
        )
        .map((quasiFlow): Flow => ({ ...quasiFlow, site }))
    ),
  };

  if (
    !toolRunDetails.some((runDetail) => runDetail.monitorState.loadingCompleted)
  ) {
    return {
      ...coverageBase,
      eventuallyCompatible: null,
    };
  }

  // Transparency

  const transparencyBase = {
    ...coverageBase,
    eventuallyCompatible: true as true,
  };

  if (!browserSiteResult || isFailure(browserSiteResult)) {
    return {
      ...transparencyBase,
      transparencyAnalyzable: false,
    };
  }

  const { value: browserReport } = browserSiteResult;

  if (isFailure(browserReport.runsCompletion)) {
    return {
      ...transparencyBase,
      transparencyAnalyzable: false,
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
      transparencyAnalyzable: false,
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

const getToolReport = (toolSiteReportMatrix: ToolSiteReportMatrix) => {
  const getFlows = (r: ToolSiteReport) =>
    r.eventuallyCompatible !== false ? r.flows : [];

  const totalFlows = uniqFlow(
    toolSiteReportMatrix.flatMap(({ toolSiteReports: rs }) =>
      rs.flatMap((r) => getFlows(r))
    )
  );
  // writeFileSync("totalFlows.json", JSON.stringify(totalFlows));

  return toolSiteReportMatrix.map(({ toolName, toolSiteReports: rs }) => {
    const rsTransparencyAnalyzable = rs.filter(
      (
        r
      ): r is typeof r & {
        eventuallyCompatible: true;
        transparencyAnalyzable: true;
      } => r.eventuallyCompatible === true && r.transparencyAnalyzable
    );

    const localFlows = rs.flatMap((r) => getFlows(r));

    return {
      toolName,
      all: rs.length,
      syntacticallyCompatible: count(rs, (r) => r.syntacticallyCompatible),
      compatible: count(
        rs,
        (r) => r.syntacticallyCompatible && r.eventuallyCompatible === true
      ),
      eventuallyCompatible: count(rs, (r) => r.eventuallyCompatible === true),
      unknownCompatible: count(
        rs,
        (r) => r.syntacticallyCompatible && r.eventuallyCompatible === null
      ),
      unknownEventuallyCompatible: count(
        rs,
        (r) => r.eventuallyCompatible === null
      ),
      compatibilityIssues: _.countBy(
        rs.filter(
          (r): r is typeof r & { eventuallyCompatible: false } =>
            r.eventuallyCompatible === false
        ),
        (r) => r.compatibilityIssue
      ),
      unclassifiedTransformErrors: _.uniq(
        rs.flatMap((r) =>
          r.eventuallyCompatible === false
            ? r.unclassifiedTransformErrors ?? []
            : []
        )
      ),
      transparencyAnalyzable: rsTransparencyAnalyzable.length,
      nonTransparent: count(rsTransparencyAnalyzable, (r) => !r.transparent),
      transparent: count(rsTransparencyAnalyzable, (r) => r.transparent),
      _transparentSites: rsTransparencyAnalyzable
        .filter((r) => r.transparent)
        .map((r) => r.site),
      transparencyIssues: _.countBy(
        rsTransparencyAnalyzable
          .filter((r): r is typeof r & { transparent: false } => !r.transparent)
          .flatMap((r) => r.jsErrors)
      ),
      flows: localFlows.length,
      _flows: localFlows,
      goodnessFlows: localFlows.length / totalFlows.length,
      goodnessSites:
        _.uniq(_.map(localFlows, "site")).length /
        _.uniq(_.map(totalFlows, "site")).length,
      falseTrivials: _.sum(
        rs
          .map(
            (r, i) =>
              r.eventuallyCompatible === true &&
              r.transparencyAnalyzable &&
              r.transparent &&
              r.flows.length === 0 &&
              toolSiteReportMatrix.some(({ toolSiteReports: rs1 }) => {
                const r1 = rs1[i];
                return r1.eventuallyCompatible !== false && r1.flows.length > 0;
              })
          )
          .map(Number)
      ), // falseTrivials = 0 is good for tools with goodnessFlows = 0
      overhead: avg(
        rsTransparencyAnalyzable
          .filter((r): r is typeof r & { transparent: true } => r.transparent)
          .map((r) => r.overhead)
      ),
    };
  });
};
