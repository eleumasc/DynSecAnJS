import { Args } from "../archive/Args";
import { BrowserOrToolName, isToolName } from "../collection/ToolName";
import { CollectArchive, CollectLogfile } from "../archive/CollectArchive";
import { CollectSiteArgs, collectSiteFilename } from "../workers/collectSite";
import { ipExec } from "../util/interprocess";
import { PreanalyzeArchive } from "../archive/PreanalyzeArchive";
import { RecordArchive } from "../archive/RecordArchive";
import { retryOnce } from "../util/retryOnce";
import { useMonitorBundle } from "../collection/MonitorBundle";
import {
  ChildInitCommandController,
  initCommand,
} from "../archive/initCommand";
import {
  ArchiveProcessSitesController,
  processSites,
} from "../util/processSites";

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
    new ChildInitCommandController(
      PreanalyzeArchive,
      (requireArgs) => requireArgs.preanalyzeArchivePath,
      (requireArgs) => `Collect-${requireArgs.browserOrToolName}`,
      (requireArgs, { parentArchiveName, sitesState }): CollectLogfile => {
        return {
          type: "CollectLogfile",
          browserOrToolName: requireArgs.browserOrToolName,
          preanalyzeArchiveName: parentArchiveName,
          sitesState,
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
        new ArchiveProcessSitesController(archive),
        concurrencyLimit,
        async (site) => {
          const { archivePath } = archive;
          await retryOnce(async () => {
            await ipExec(collectSiteFilename, [
              {
                site,
                browserOrToolName,
                archivePath,
                preanalyzeArchivePath: preanalyzeArchive.archivePath,
                recordArchivePath: recordArchive.archivePath,
                bundlePath,
              } satisfies CollectSiteArgs,
            ]);
          });
        }
      );
    }
  );

  process.exit(0);
};
