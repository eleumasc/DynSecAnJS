import _ from "lodash";
import { avg } from "../util/math";
import { CompatibilityIssue } from "../measurement/CompatibilityIssue";
import { count } from "../measurement/util";
import { Flow } from "../measurement/flow/Flow";
import { getMeta, setMeta } from "../util/meta";
import { ToolSiteReportMatrix } from "../measurement/ToolSiteReportMatrix";
import { ToolSiteReportPerformanceData } from "./ToolSiteReport";

export const getToolReport = (
  toolSiteReportMatrix: ToolSiteReportMatrix,
  matchingFlows?: Flow[]
) => {
  return toolSiteReportMatrix.map(({ toolName, toolSiteReports: rs }) => {
    const rsTransparencyAnalyzable = rs.filter(
      (
        r
      ): r is typeof r & {
        transparencyAnalyzable: true;
      } => r.transparencyAnalyzable
    );
    const rsPerformanceAnalyzable = rsTransparencyAnalyzable.filter(
      (r): r is typeof r & { performanceData: ToolSiteReportPerformanceData } =>
        r.transparent && r.performanceData !== null
    );

    const rsScriptsTotal = _.uniqBy(
      rs.flatMap((r) => r.scripts),
      "hash"
    ).length;
    const syntacticallyCompatibleScore =
      _.uniqBy(
        rs.flatMap((r) => r.syntacticallyCompatibleScripts),
        "hash"
      ).length / rsScriptsTotal;
    // We consider unknown cases in compatibleScore and eventuallyCompatibleScore
    const compatibleScore =
      _.uniqBy(
        rs.flatMap((r) =>
          r.eventuallyCompatibleScripts !== null
            ? _.intersection(
                r.eventuallyCompatibleScripts,
                r.syntacticallyCompatibleScripts
              )
            : r.scripts
        ),
        "hash"
      ).length / rsScriptsTotal;
    const eventuallyCompatibleScore =
      _.uniqBy(
        rs.flatMap((r) =>
          r.eventuallyCompatibleScripts !== null
            ? r.eventuallyCompatibleScripts
            : r.scripts
        ),
        "hash"
      ).length / rsScriptsTotal;

    const rsKnown = rs.filter((r) => r.eventuallyCompatibleScripts !== null);
    const crashErrorCount = count(
      rs,
      (r) => r.compatibilityIssue === CompatibilityIssue.CrashError
    );
    const transpileErrorCount = count(
      rs,
      (r) => r.compatibilityIssue === CompatibilityIssue.TranspileError
    );
    const parseErrorCount = _.uniqBy(
      rsKnown.flatMap((r) => r.parseErrorScripts),
      "hash"
    ).length;
    const analysisErrorCount = _.uniqBy(
      rsKnown.flatMap((r) => r.analysisErrorScripts),
      "hash"
    ).length;

    const toolFlows = rs.flatMap((r) => r.flows);
    const othersFlows = toolSiteReportMatrix
      .map(({ toolSiteReports: rs }) => rs)
      .filter((rsOther) => rsOther !== rs)
      .flatMap((rsOther) => rsOther.flatMap((r) => r.flows));
    const cooperativeAgreementFlows = _.intersectionWith(
      toolFlows,
      othersFlows,
      _.isEqual
    ).map((flow) =>
      setMeta(flow, { ...getMeta(flow), cooperativeAgreement: true })
    );
    const syntacticalAgreementFlows = _.intersectionWith(
      toolFlows,
      matchingFlows ?? [],
      _.isEqual
    ).map((flow) =>
      setMeta(flow, { ...getMeta(flow), syntacticalAgreement: true })
    );
    const unionAgreementFlows = _.union(
      cooperativeAgreementFlows,
      syntacticalAgreementFlows
    );

    return {
      toolName,
      all: rs.length,
      syntacticallyCompatibleScore,
      compatibleScore,
      eventuallyCompatibleScore,
      compatibilityIssues: {
        [CompatibilityIssue.CrashError]: crashErrorCount,
        [CompatibilityIssue.TranspileError]: transpileErrorCount,
        [CompatibilityIssue.ParseError]: parseErrorCount,
        [CompatibilityIssue.AnalysisError]: analysisErrorCount,
      },
      unclassifiedTransformErrors: _.uniq(
        rs.flatMap((r) => r.unclassifiedTransformErrors ?? [])
      ),
      transparencyAnalyzable: rsTransparencyAnalyzable.length,
      executionTraceNotFound: count(
        rs,
        (r) => !r.transparencyAnalyzable && r.executionTraceNotFound === true
      ),
      nonTransparent: count(rsTransparencyAnalyzable, (r) => !r.transparent),
      transparent: count(rsTransparencyAnalyzable, (r) => r.transparent),
      transparencyIssues: _.countBy(
        rsTransparencyAnalyzable
          .filter((r): r is typeof r & { transparent: false } => !r.transparent)
          .flatMap((r) => r.jsErrors)
      ),
      flows: toolFlows.length,
      matchingFlows: matchingFlows?.length,
      cooperativeAgreementFlows: cooperativeAgreementFlows.length,
      syntacticalAgreementFlows: syntacticalAgreementFlows.length,
      unionAgreementFlows: unionAgreementFlows.length,
      performanceAnalyzable: rsPerformanceAnalyzable.length,
      overhead: avg(
        rsPerformanceAnalyzable.map(
          (r) =>
            r.performanceData.toolExecutionTimeAvg /
            r.performanceData.browserExecutionTimeAvg
        )
      ),
      // _flows: toolFlows,
      _unionAgreementFlows: unionAgreementFlows.map((flow) => {
        return { ...flow, meta: getMeta(flow) };
      }),
      _falsePositiveFlows: _.difference(toolFlows, unionAgreementFlows).map(
        (flow) => {
          return { ...flow, meta: getMeta(flow) };
        }
      ),
    };
  });
};
