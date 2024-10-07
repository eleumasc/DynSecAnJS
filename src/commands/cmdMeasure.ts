import path from "path";
import { Args } from "../archive/Args";
import { CollectArchive } from "../archive/CollectArchive";
import { getLibraryRanking } from "../measurement/LibraryRanking";
import { getMatchingFlows } from "../measurement/flow/MatchingFlows";
import { getMeta } from "../util/meta";
import { getSyntaxReport } from "../measurement/SyntaxReport";
import { getToolReport } from "../measurement/ToolReport";
import { getToolSiteReportMatrix } from "../measurement/ToolSiteReportMatrix";
import { isSuccess, Success } from "../util/Completion";
import { MeasureArchive, MeasureLogfile } from "../archive/MeasureArchive";
import { pairToolBrowserCollectArchives } from "../measurement/ToolBrowserCollectArchivePair";
import { RecordArchive } from "../archive/RecordArchive";
import { SiteSyntaxEntry } from "../measurement/SiteSyntaxEntry";
import { writeFileSync } from "fs";
import {
  PreanalyzeArchive,
  PreanalyzeReport,
} from "../archive/PreanalyzeArchive";
import {
  DerivedInitCommandController,
  initCommand,
} from "../archive/initCommand";

export type MeasureArgs = Args<
  {
    preanalyzeArchivePath: string;
    collectArchivePaths: string[];
  },
  {}
>;

export const cmdMeasure = (args: MeasureArgs) => {
  const { archive, resolveArchivePath } = initCommand(
    args,
    MeasureArchive,
    new DerivedInitCommandController(
      PreanalyzeArchive,
      (requireArgs) => requireArgs.preanalyzeArchivePath,
      () => "Measure",
      (requireArgs, { parentArchiveName }): MeasureLogfile => {
        return {
          type: "MeasureLogfile",
          preanalyzeArchiveName: parentArchiveName,
          collectArchiveNames: requireArgs.collectArchivePaths,
        };
      }
    )
  );

  const preanalyzeArchive = PreanalyzeArchive.open(
    resolveArchivePath(archive.logfile.preanalyzeArchiveName)
  );
  const collectArchives = archive.logfile.collectArchiveNames.map(
    (collectArchiveName) =>
      CollectArchive.open(resolveArchivePath(collectArchiveName))
  );
  const recordArchive = RecordArchive.open(
    resolveArchivePath(preanalyzeArchive.logfile.recordArchiveName)
  );

  const siteSyntaxEntries = Object.entries(preanalyzeArchive.logfile.sitesState)
    .filter(
      ([site, isProcessed]) =>
        isProcessed &&
        collectArchives.every(
          (collectArchive) => collectArchive.logfile.sitesState[site]
        )
    )
    .map(([site]) => {
      return { site, siteResult: preanalyzeArchive.readSiteResult(site) };
    })
    .filter((x): x is typeof x & { siteResult: Success<PreanalyzeReport> } =>
      isSuccess(x.siteResult)
    )
    .map(({ site, siteResult }): SiteSyntaxEntry => {
      return { site, syntax: siteResult.value };
    })
    .map(({ site, syntax }) => {
      const { scripts } = syntax;
      return {
        site,
        syntax: {
          ...syntax,
          scripts: scripts.filter(
            (script) => !(script.type === "inline" && script.isEventHandler)
          ),
        },
      };
    });

  const toolBrowserCollectArchivePairs =
    pairToolBrowserCollectArchives(collectArchives);

  const toolSiteReportMatrix = getToolSiteReportMatrix(
    toolBrowserCollectArchivePairs,
    siteSyntaxEntries
  );

  const matchingFlows = getMatchingFlows(siteSyntaxEntries, recordArchive);
  writeFileSync(
    path.join(archive.archivePath, "matchingFlows.json"),
    JSON.stringify(
      matchingFlows.map((flow) => ({ ...flow, meta: getMeta(flow) }))
    )
  );

  // Syntax measurement

  const syntaxReport = getSyntaxReport(siteSyntaxEntries, toolSiteReportMatrix);
  console.log(syntaxReport);

  // Tool measurement

  const toolReport = getToolReport(toolSiteReportMatrix, matchingFlows);
  console.log(toolReport);

  // Library ranking

  const libraryRanking = getLibraryRanking(
    siteSyntaxEntries,
    toolSiteReportMatrix
  );
  console.log(libraryRanking);

  archive.logfile = {
    ...archive.logfile,
    syntaxReport,
    toolReport,
    libraryRanking,
  };
};
