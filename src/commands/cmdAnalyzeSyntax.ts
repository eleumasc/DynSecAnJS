import workerpool from "workerpool";
import { AnalyzeSyntaxSiteArgs } from "../workers/analyzeSyntaxSite";
import { Args } from "../archive/Args";
import { getWorkerFilename } from "../workers/getWorkerFilename";
import { RecordArchive } from "../archive/RecordArchive";
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

  const workerName = "analyzeSyntaxSite";
  const pool = workerpool.pool(getWorkerFilename(workerName), {
    workerType: "thread",
  });
  await processSites(
    new ArchiveProcessSitesController(archive),
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      await pool.exec(workerName, [
        {
          site,
          archivePath,
          recordArchivePath: recordArchive.archivePath,
        } satisfies AnalyzeSyntaxSiteArgs,
      ]);
    }
  );
  await pool.terminate();
};
