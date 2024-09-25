import _ from "lodash";
import assert from "assert";
import { Args } from "../archive/Args";
import { avg, stdev } from "../util/math";
import { classifyJSErrors, JSError } from "../measurement/TransparencyIssue";
import { computeRanking, count } from "../measurement/util";
import { Flow, getToolFlows, uniqFlow } from "../measurement/flow/Flow";
import { isFailure } from "../util/Completion";
import { isSyntacticallyCompatible } from "../collection/isSyntacticallyCompatible";
import { MeasureArchive, MeasureLogfile } from "../archive/MeasureArchive";
import { PreanalyzeArchive } from "../archive/PreanalyzeArchive";
import { SiteResult } from "../archive/Archive";
import { Syntax } from "../syntax/Syntax";
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

  const siteSyntaxEntries = Object.entries(preanalyzeArchive.logfile.sitesState)
    // TODO: remove the following two lines after performing analysis on all sites or fixing processedSites
    .filter(([_, isProcessed]) => isProcessed) // TEST-500
    .slice(0, 500) // TEST-500
    .flatMap(([site, isProcessed]) => {
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
  eventuallyCompatibleTotal: number;
  eventuallyCompatibleCount: number | null;
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

const getToolSiteReport = (
  site: string,
  syntax: Syntax,
  toolName: ToolName,
  toolSiteResult: SiteResult<CollectReport> | null,
  browserSiteResult: SiteResult<CollectReport> | null
): ToolSiteReport => {
  // Compatibility & Coverage

  const eventuallyCompatibleTotal = syntax.scripts.length;
  const badCompatibilityBase = {
    site,
    syntacticallyCompatible: isSyntacticallyCompatible(
      toolName,
      syntax.minimumESVersion
    ),
    eventuallyCompatibleTotal,
    eventuallyCompatibleCount: 0,
    flows: [],
    transparencyAnalyzable: false as false,
  };

  if (!toolSiteResult) {
    return {
      ...badCompatibilityBase,
      compatibilityIssue: CompatibilityIssue.CrashError,
    };
  }

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
  const nonErrorScripts = _.differenceWith(
    syntax.scripts,
    errorScriptIds,
    (script, id) => script.id === id
  );
  const eventuallyCompatibleCount = nonErrorScripts.length;

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
    flows,
    ...transformErrorsDetail,
  };

  if (
    !toolRunDetails.some((runDetail) => runDetail.monitorState.loadingCompleted)
  ) {
    return {
      ...compatibilityBase,
      eventuallyCompatibleCount: null,
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

  if (!browserSiteResult || isFailure(browserSiteResult)) {
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

const getToolReport = (toolSiteReportMatrix: ToolSiteReportMatrix) => {
  const totalFlows = uniqFlow(
    toolSiteReportMatrix.flatMap(({ toolSiteReports: rs }) =>
      rs.flatMap((r) => r.flows)
    )
  );
  // writeFileSync("totalFlows.json", JSON.stringify(totalFlows));

  return toolSiteReportMatrix.map(({ toolName, toolSiteReports: rs }) => {
    const rsTransparencyAnalyzable = rs.filter(
      (
        r
      ): r is typeof r & {
        transparencyAnalyzable: true;
      } => r.transparencyAnalyzable
    );
    const rsKnown = rs.filter((r) => r.eventuallyCompatibleCount !== null);

    const scoreEventualCompatibility = (
      intersectSyntactical: boolean = false
    ): number => {
      return (
        _.sum(
          _.map(
            intersectSyntactical
              ? rsKnown.filter((r) => r.syntacticallyCompatible)
              : rsKnown,
            (r) => r.eventuallyCompatibleCount as number
          )
        ) / _.sum(_.map(rsKnown, (r) => r.eventuallyCompatibleTotal))
      );
    };

    const localFlows = rs.flatMap((r) => r.flows);

    return {
      toolName,
      all: rs.length,
      syntacticallyCompatibleScore:
        count(rs, (r) => r.syntacticallyCompatible) / rs.length,
      compatibleScore: scoreEventualCompatibility(true),
      eventuallyCompatibleScore: scoreEventualCompatibility(),
      unknownCompatible: count(
        rs,
        (r) => r.syntacticallyCompatible && r.eventuallyCompatibleCount === null
      ),
      unknownEventuallyCompatible: count(
        rs,
        (r) => r.eventuallyCompatibleCount === null
      ),
      compatibilityIssues: _.countBy(
        rs.filter(
          (r): r is typeof r & { compatibilityIssue: CompatibilityIssue } =>
            Boolean(r.compatibilityIssue)
        ),
        (r) => r.compatibilityIssue
      ),
      unclassifiedTransformErrors: _.uniq(
        rs.flatMap((r) => r.unclassifiedTransformErrors ?? [])
      ),
      transparencyAnalyzable: rsTransparencyAnalyzable.length,
      nonTransparent: count(rsTransparencyAnalyzable, (r) => !r.transparent),
      transparent: count(rsTransparencyAnalyzable, (r) => r.transparent),
      // _transparentSites: rsTransparencyAnalyzable
      //   .filter((r) => r.transparent)
      //   .map((r) => r.site),
      transparencyIssues: _.countBy(
        rsTransparencyAnalyzable
          .filter((r): r is typeof r & { transparent: false } => !r.transparent)
          .flatMap((r) => r.jsErrors)
      ),
      flows: localFlows.length,
      // _flows: localFlows,
      coverageFlows: localFlows.length / totalFlows.length,
      coverageSites:
        _.uniq(_.map(localFlows, "site")).length /
        _.uniq(_.map(totalFlows, "site")).length,
      overhead: avg(
        rsTransparencyAnalyzable
          .filter((r): r is typeof r & { transparent: true } => r.transparent)
          .map((r) => r.overhead)
      ),
    };
  });
};
