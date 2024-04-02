import {
  intersectSitelists,
  intersectSitelistsFromFile,
} from "../core/sitelist";

import ArchiveReader from "../lib/ArchiveReader";
import { createReport } from "../measurement/Report";
import { deserializeOriginalAnalysisResult } from "../lib/OriginalAnalysis";
import { deserializeToolAnalysisResult } from "../lib/ToolAnalysis";
import { getSiteInfo } from "../measurement/SiteInfo";

export interface TransparencyArgs {
  originalArchivePath: string;
  toolArchivePath: string;
  intersectSitelistPath?: string;
}

export const startTransparency = async (args: TransparencyArgs) => {
  const { originalArchivePath, toolArchivePath, intersectSitelistPath } = args;

  const originalArchive = new ArchiveReader(
    originalArchivePath,
    "original-analysis",
    deserializeOriginalAnalysisResult
  );
  const originalSitelist = originalArchive.getSitelist();
  const toolArchive = new ArchiveReader(
    toolArchivePath,
    "tool-analysis",
    deserializeToolAnalysisResult
  );
  const toolSitelist = toolArchive.getSitelist();
  const bothSitelist = intersectSitelistsFromFile(
    intersectSitelists(originalSitelist, toolSitelist),
    intersectSitelistPath
  );

  const siteInfos = bothSitelist.map((site) => {
    const originalLogfile = originalArchive.load(site);
    const toolLogfile = toolArchive.load(site);
    return getSiteInfo(site, originalLogfile.data, toolLogfile.data);
  });

  const report = createReport(siteInfos);

  console.log(report);
};
