import { Args } from "../archive/Args";
import { BrowserOrToolName, isToolName } from "../collection/ToolName";
import { CollectArchive, CollectLogfile } from "../archive/CollectArchive";
import { CollectSiteArgs, collectSiteFilename } from "../workers/collectSite";
import { ipExec } from "../util/interprocess";
import { isFailure, toCompletion } from "../util/Completion";
import { PreanalyzeArchive } from "../archive/PreanalyzeArchive";
import { RecordArchive } from "../archive/RecordArchive";
import { useMonitorBundle } from "../collection/MonitorBundle";
import {
  DerivedInitCommandController,
  deriveSitesState,
  initCommand,
} from "../archive/initCommand";
import {
  ResumableProcessSitesController,
  processSites,
} from "../archive/processSites";

export type CollectArgs = Args<
  {
    browserOrToolName: BrowserOrToolName;
    preanalyzeArchivePath: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdCollect = async (args: CollectArgs) => {
  const {
    archive,
    processArgs: { concurrencyLimit },
    resolveArchivePath,
  } = initCommand(
    args,
    CollectArchive,
    new DerivedInitCommandController(
      PreanalyzeArchive,
      (requireArgs) => requireArgs.preanalyzeArchivePath,
      (requireArgs) => `Collect-${requireArgs.browserOrToolName}`,
      (requireArgs, { parentArchive, parentArchiveName }): CollectLogfile => {
        return {
          type: "CollectLogfile",
          browserOrToolName: requireArgs.browserOrToolName,
          preanalyzeArchiveName: parentArchiveName,
          sitesState: deriveSitesState(parentArchive),
        };
      }
    )
  );

  const preanalyzeArchive = PreanalyzeArchive.open(
    resolveArchivePath(archive.logfile.preanalyzeArchiveName)
  );
  const recordArchive = RecordArchive.open(
    resolveArchivePath(preanalyzeArchive.logfile.recordArchiveName)
  );

  const { browserOrToolName } = archive.logfile;
  const toolName = isToolName(browserOrToolName)
    ? browserOrToolName
    : undefined;

  await useMonitorBundle(
    {
      toolName,
    },
    async (bundlePath) => {
      await processSites(
        new ResumableProcessSitesController(archive),
        concurrencyLimit,
        async (site) => {
          const { archivePath } = archive;
          const outerCompletion = await toCompletion(async () => {
            const innerCompletion = await ipExec(collectSiteFilename, [
              {
                site,
                browserOrToolName,
                archivePath,
                preanalyzeArchivePath: preanalyzeArchive.archivePath,
                recordArchivePath: recordArchive.archivePath,
                bundlePath,
              } satisfies CollectSiteArgs,
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
    }
  );

  process.exit(0);
};
