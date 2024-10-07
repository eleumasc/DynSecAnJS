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

  const toolEventuallyCompatibleExternalScriptsEntries =
    toolSiteReportMatrix.map(({ toolName, toolSiteReports: rs }) => {
      return {
        toolName,
        eventuallyCompatibleExternalScripts: rs
          .flatMap((r) => r.eventuallyCompatibleScripts ?? [])
          .filter(isScriptExternal),
      };
    });

  return _.sortBy(Object.values(scriptGroups), (scripts) => scripts.length)
    .reverse()
    .map((scripts) => {
      return {
        library: scripts[0].url,
        usage: scripts.length,
        compatibleTools: toolEventuallyCompatibleExternalScriptsEntries
          .filter(
            ({ eventuallyCompatibleExternalScripts }) =>
              _.intersection(scripts, eventuallyCompatibleExternalScripts)
                .length > 0
          )
          .map(({ toolName }) => toolName),
      };
    });
};
