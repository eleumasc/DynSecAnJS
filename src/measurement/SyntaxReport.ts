import _ from "lodash";
import { computePopularityRanking } from "./util";
import { SiteSyntaxEntry } from "./SiteSyntaxEntry";
import { ToolSiteReportMatrix } from "./ToolSiteReportMatrix";

export const getSyntaxReport = (
  siteSyntaxEntries: SiteSyntaxEntry[],
  toolSiteReportMatrix: ToolSiteReportMatrix
) => {
  const all = siteSyntaxEntries.map(({ syntax }) => syntax);
  const havingScript = all.filter((syntax) => syntax.scripts.length > 0);

  const versionRankingSites = computePopularityRanking(
    havingScript,
    (syntax) => [syntax.minimumESVersion]
  );
  const featureRankingSites = computePopularityRanking(havingScript, (syntax) =>
    _.uniq(syntax.scripts.flatMap((script) => script.features))
  );

  const allScripts = all.flatMap((syntax) => syntax.scripts);
  const dedupScripts = _.uniqBy(allScripts, "hash");

  const toolSupportedFeaturesEntries = toolSiteReportMatrix.map(
    ({ toolName, toolSiteReports: rs }) => {
      return {
        toolName,
        supportedFeatures: rs
          .flatMap((r) => r.eventuallyCompatibleScripts ?? [])
          .flatMap((script) => script.features),
      };
    }
  );

  const versionRankingScripts = computePopularityRanking(
    dedupScripts,
    (script) => [script.minimumESVersion]
  );
  const featureRankingScripts = computePopularityRanking(
    dedupScripts,
    (script) => script.features
  ).map(([feature, popularity]) => [
    feature,
    popularity,
    toolSupportedFeaturesEntries
      .filter(({ supportedFeatures }) => supportedFeatures.includes(feature))
      .map(({ toolName }) => toolName),
  ]);

  return {
    allSites: all.length,
    havingScriptSites: havingScript.length,
    versionRankingSites,
    featureRankingSites,
    allScripts: allScripts.length,
    dedupScripts: dedupScripts.length,
    versionRankingScripts,
    featureRankingScripts,
  };
};
