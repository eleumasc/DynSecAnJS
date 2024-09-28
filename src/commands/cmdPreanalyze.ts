import { Args } from "../archive/Args";
import { isFailure, toCompletion } from "../util/Completion";
import { RecordArchive } from "../archive/RecordArchive";
import { threadExec } from "../util/thread";
import {
  PreanalyzeSiteArgs,
  preanalyzeSiteFilename,
} from "../workers/preanalyzeSite";
import {
  initCommand,
  DerivedInitCommandController,
  deriveSitesState,
} from "../archive/initCommand";
import {
  PreanalyzeArchive,
  PreanalyzeLogfile,
} from "../archive/PreanalyzeArchive";
import {
  ResumableProcessSitesController,
  processSites,
} from "../archive/processSites";

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
    new DerivedInitCommandController(
      RecordArchive,
      (requireArgs) => requireArgs.recordArchivePath,
      () => "Preanalyze",
      (
        _requireArgs,
        { parentArchive, parentArchiveName }
      ): PreanalyzeLogfile => {
        return {
          type: "PreanalyzeLogfile",
          recordArchiveName: parentArchiveName,
          sitesState: deriveSitesState(parentArchive),
        };
      }
    )
  );

  const recordArchive = RecordArchive.open(
    resolveArchivePath(archive.logfile.recordArchiveName)
  );

  await processSites(
    new ResumableProcessSitesController(archive),
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      const outerCompletion = await toCompletion(async () => {
        const innerCompletion = await threadExec(preanalyzeSiteFilename, [
          {
            site,
            archivePath,
            recordArchivePath: recordArchive.archivePath,
          } satisfies PreanalyzeSiteArgs,
        ]);
        if (isFailure(innerCompletion)) {
          archive.writeSiteResult(site, innerCompletion);
        }
      });
      if (isFailure(outerCompletion)) {
        archive.writeSiteResult(site, outerCompletion);
      }
    }
  );

  process.exit(0);
};
