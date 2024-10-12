import { CollectArchive } from "../archive/CollectArchive";
import { SiteSyntaxEntry } from "../measurement/SiteSyntaxEntry";
import { ToolBrowserCollectArchivePair } from "../measurement/ToolBrowserCollectArchivePair";
import { ToolName } from "../collection/ToolName";
import {
  getToolSiteReport,
  ToolSiteReport,
} from "../measurement/ToolSiteReport";

export type ToolSiteReportMatrix = ToolSiteReportMatrixRow[];

export type ToolSiteReportMatrixRow = {
  toolName: ToolName;
  toolSiteReports: ToolSiteReport[];
};

export const getToolSiteReportMatrix = (
  toolBrowserCollectArchivePairs: ToolBrowserCollectArchivePair[],
  siteSyntaxEntries: SiteSyntaxEntry[]
): ToolSiteReportMatrix => {
  return toolBrowserCollectArchivePairs.map(
    ({ toolArchive, browserArchive }) => {
      const toolName = toolArchive.logfile.browserOrToolName as ToolName;
      const toolSiteReports = siteSyntaxEntries
        .filter(({ syntax }) => syntax.scripts.length > 0)
        .map(({ site, syntax }): ToolSiteReport => {
          console.log(`[getToolSiteReport] ${site}@${toolName}`);

          const getSiteResult = (collectArchive: CollectArchive) =>
            collectArchive.readSiteResult(site);

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
