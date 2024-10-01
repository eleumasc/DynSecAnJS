import _ from "lodash";
import { SiteSyntaxEntry } from "../measurement/SiteSyntaxEntry";
import { SyntaxScript } from "../syntax/Syntax";
import { ToolSiteReportMatrix } from "../measurement/ToolSiteReportMatrix";

export const getLibraryRanking = (
  siteSyntaxEntries: SiteSyntaxEntry[],
  toolSiteReportMatrix: ToolSiteReportMatrix
) => {
  interface Cluster {
    key: string;
    scripts: SyntaxScript[];
  }

  const isScriptExternal = (
    script: SyntaxScript
  ): script is typeof script & { type: "external" } =>
    script.type === "external";

  const clusterMap = new Map<string, SyntaxScript[]>();
  for (const { syntax } of siteSyntaxEntries) {
    const externalScripts = syntax.scripts.filter(isScriptExternal);
    for (const script of externalScripts) {
      const { url: scriptUrl } = script;
      clusterMap.set(scriptUrl, [...(clusterMap.get(scriptUrl) ?? []), script]);
    }
  }
  const clusters = [...clusterMap].map(([url, scripts]): Cluster => {
    return { key: url, scripts };
  });

  const toolErrorExternalScriptEntries = toolSiteReportMatrix.map(
    ({ toolName, toolSiteReports: rs }) => {
      return {
        toolName,
        errorExternalScripts: rs
          .flatMap((r) => r.errorScripts ?? [])
          .filter(isScriptExternal),
      };
    }
  );

  return _.sortBy(clusters, (cluster) => cluster.scripts.length)
    .reverse()
    .map(({ key, scripts }) => {
      return {
        library: key,
        usage: scripts.length,
        astNodesCountArray: scripts.map((script) => script.astNodesCount),
        compatibleTools: toolErrorExternalScriptEntries
          .filter(
            ({ errorExternalScripts }) =>
              _.intersection(scripts, errorExternalScripts).length === 0
          )
          .map(({ toolName }) => toolName),
      };
    });
};
