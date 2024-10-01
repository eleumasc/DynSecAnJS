import _ from "lodash";
import { computePopularityRanking } from "./util";
import { SiteSyntaxEntry } from "./SiteSyntaxEntry";

export const getSyntaxReport = (siteSyntaxEntries: SiteSyntaxEntry[]) => {
  const syntaxes = siteSyntaxEntries.map(({ syntax }) => syntax);
  const all = syntaxes.length;
  const havingScriptSyntaxes = syntaxes.filter(
    (syntax) => syntax.scripts.length > 0
  );
  const havingScript = havingScriptSyntaxes.length;
  const versionRanking = computePopularityRanking(
    havingScriptSyntaxes,
    (syntax) => [syntax.minimumESVersion]
  );
  const featureRanking = computePopularityRanking(
    havingScriptSyntaxes,
    (syntax) => _.uniq(syntax.scripts.flatMap((script) => script.features))
  );
  return {
    all,
    havingScript,
    versionRanking,
    featureRanking,
  };
};
