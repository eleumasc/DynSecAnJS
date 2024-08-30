import { Args } from "../archive/Args";
import { RecordArchive } from "../archive/RecordArchive";
import { threadExec } from "../util/thread";
import {
  AnalyzeSyntaxSiteArgs,
  analyzeSyntaxSiteFilename,
} from "../workers/analyzeSyntaxSite";
import {
  initCommand,
  ChildInitCommandController,
} from "../archive/initCommand";
import {
  AnalyzeSyntaxArchive,
  AnalyzeSyntaxLogfile,
} from "../archive/AnalyzeSyntaxArchive";
import {
  ArchiveProcessSitesController,
  processSites,
} from "../util/processSites";

export type AnalyzeSyntaxArgs = Args<
  {
    recordArchivePath: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdAnalyzeSyntax = async (args: AnalyzeSyntaxArgs) => {
  const {
    archive,
    processArgs: { concurrencyLimit },
    resolveArchivePath,
  } = initCommand(
    args,
    AnalyzeSyntaxArchive,
    new ChildInitCommandController(
      RecordArchive,
      (requireArgs) => requireArgs.recordArchivePath,
      () => "AnalyzeSyntax",
      (
        _requireArgs,
        { parentArchiveName, sitesState }
      ): AnalyzeSyntaxLogfile => {
        return {
          type: "AnalyzeSyntaxLogfile",
          recordArchiveName: parentArchiveName,
          sitesState,
        };
      }
    )
  );

  const recordArchive = RecordArchive.open(
    resolveArchivePath(archive.logfile.recordArchiveName)
  );

  await processSites(
    new ArchiveProcessSitesController(archive),
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      await threadExec(analyzeSyntaxSiteFilename, [
        {
          site,
          archivePath,
          recordArchivePath: recordArchive.archivePath,
        } satisfies AnalyzeSyntaxSiteArgs,
      ]);
    }
  );
};
