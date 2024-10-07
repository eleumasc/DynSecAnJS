import _ from "lodash";
import { SiteSyntaxEntry } from "../measurement/SiteSyntaxEntry";
import { SyntaxScript } from "../syntax/Syntax";
import { ToolSiteReportMatrix } from "../measurement/ToolSiteReportMatrix";

export const getLibraryRanking = (
  siteSyntaxEntries: SiteSyntaxEntry[],
  toolSiteReportMatrix: ToolSiteReportMatrix
) => {
  const isScriptExternal = (
    script: SyntaxScript
  ): script is typeof script & { type: "external" } =>
    script.type === "external";

  const scriptGroups = _.groupBy(
    siteSyntaxEntries
      .flatMap(({ syntax }) => syntax.scripts)
      .filter(isScriptExternal),
    "hash"
  );

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

  return _.sortBy(Object.values(scriptGroups), (scripts) => scripts.length)
    .reverse()
    .map((scripts) => {
      return {
        library: scripts[0].url,
        usage: scripts.length,
        compatibleTools: toolErrorExternalScriptEntries
          .filter(
            ({ errorExternalScripts }) =>
              _.intersection(scripts, errorExternalScripts).length === 0
          )
          .map(({ toolName }) => toolName),
      };
    });
};
