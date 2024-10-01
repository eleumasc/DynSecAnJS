import _ from "lodash";
import { avg } from "../util/math";
import { CompatibilityIssue } from "../measurement/CompatibilityIssue";
import { count } from "../measurement/util";
import { Flow } from "../measurement/flow/Flow";
import { ToolSiteReportMatrix } from "../measurement/ToolSiteReportMatrix";

export const getToolReport = (
  toolSiteReportMatrix: ToolSiteReportMatrix,
  matchingFlows: Flow[]
) => {
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

    const toolFlows = rs.flatMap((r) => r.flows);
    const otherFlowsArray = toolSiteReportMatrix
      .map(({ toolSiteReports: rs }) => rs)
      .filter((rsOther) => rsOther !== rs)
      .map((rsOther) => rsOther.flatMap((r) => r.flows));
    const sharedAgreementFlows = toolFlows.filter((flow) =>
      otherFlowsArray.some((otherFlows) =>
        otherFlows.some((needleFlow) => _.isEqual(needleFlow, flow))
      )
    );
    const syntacticalAgreementFlows = toolFlows.filter((flow) =>
      matchingFlows.some((needleFlow) => _.isEqual(needleFlow, flow))
    );

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
      transparencyIssues: _.countBy(
        rsTransparencyAnalyzable
          .filter((r): r is typeof r & { transparent: false } => !r.transparent)
          .flatMap((r) => r.jsErrors)
      ),
      flows: toolFlows.length,
      matchingFlows: matchingFlows.length,
      sharedAgreementFlows: sharedAgreementFlows.length,
      syntacticalAgreementFlows: syntacticalAgreementFlows.length,
      strongAgreementFlows: _.intersection(
        sharedAgreementFlows,
        syntacticalAgreementFlows
      ).length,
      overhead: avg(
        rsTransparencyAnalyzable
          .filter((r): r is typeof r & { transparent: true } => r.transparent)
          .map((r) => r.overhead)
      ),
      // _flows: toolFlows,
    };
  });
};
