import { SiteInfo, getSiteInfo } from "../measurement/SiteInfo";
import {
  intersectSitelists,
  intersectSitelistsFromFile,
} from "../core/sitelist";

import ArchiveReader from "../lib/ArchiveReader";
import assert from "assert";
import { deserializeOriginalAnalysisResult } from "../lib/OriginalAnalysis";
import { deserializeToolAnalysisResult } from "../lib/ToolAnalysis";
import { getPerformanceReport } from "../measurement/PerformanceReport";
import { getReport } from "../measurement/Report";
import { inspect } from "util";

export interface TransparencyArgs {
  archivePathRecords: [];
  intersectSitelistPath?: string;
}

export interface ArchivePathRecord {
  originalArchivePath: string;
  toolArchivePath: string;
}

export const startTransparency = async (args: TransparencyArgs) => {
  const { archivePathRecords, intersectSitelistPath } = args;
  assert(
    archivePathRecords.length > 0,
    "At least one archive path record is required"
  );

  const toolSiteInfoLists: SiteInfo[][] = [];
  for (const archivePathRecord of archivePathRecords) {
    const { originalArchivePath, toolArchivePath } = archivePathRecord;

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

    const siteInfoList = bothSitelist.map((site) => {
      const originalLogfile = originalArchive.load(site);
      const toolLogfile = toolArchive.load(site);
      return getSiteInfo(site, originalLogfile.data, toolLogfile.data);
    });
    toolSiteInfoLists.push(siteInfoList);

    const report = getReport(siteInfoList);
    console.log(
      toolArchivePath,
      inspect(report, { showHidden: false, depth: null, colors: true })
    );
  }

  // TODO: fix, hard-coded for [Jalangi, Linvail, ProjectFoxhound]
  const performanceReport = getPerformanceReport([
    toolSiteInfoLists[3],
    toolSiteInfoLists[4],
    toolSiteInfoLists[5],
  ]);
  console.log(performanceReport);
};
