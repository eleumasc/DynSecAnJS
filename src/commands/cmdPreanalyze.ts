import { Args } from "../archive/Args";
import { RecordArchive } from "../archive/RecordArchive";
import { threadExec } from "../util/thread";
import {
  PreanalyzeSiteArgs,
  preanalyzeSiteFilename,
} from "../workers/preanalyzeSite";
import {
  initCommand,
  ChildInitCommandController,
} from "../archive/initCommand";
import {
  PreanalyzeArchive,
  PreanalyzeLogfile,
} from "../archive/PreanalyzeArchive";
import {
  ArchiveProcessSitesController,
  processSites,
} from "../util/processSites";

export type PreanalyzeArgs = Args<
  {
    recordArchivePath: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdPreanalyze = async (args: PreanalyzeArgs) => {
  const {
    archive,
    processArgs: { concurrencyLimit },
    resolveArchivePath,
  } = initCommand(
    args,
    PreanalyzeArchive,
    new ChildInitCommandController(
      RecordArchive,
      (requireArgs) => requireArgs.recordArchivePath,
      () => "Preanalyze",
      (_requireArgs, { parentArchiveName, sitesState }): PreanalyzeLogfile => {
        return {
          type: "PreanalyzeLogfile",
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
      await threadExec(preanalyzeSiteFilename, [
        {
          site,
          archivePath,
          recordArchivePath: recordArchive.archivePath,
        } satisfies PreanalyzeSiteArgs,
      ]);
    }
  );
};
