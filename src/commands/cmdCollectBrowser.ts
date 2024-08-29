import workerpool from "workerpool";
import { AnalyzeSyntaxArchive } from "../archive/AnalyzeSyntaxArchive";
import { Args } from "../archive/Args";
import { BrowserName } from "../collection/BrowserName";
import { CollectBrowserSiteArgs } from "../workers/collectBrowserSite";
import { getWorkerFilename } from "../workers/getWorkerFilename";
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
import {
  CollectBrowserArchive,
  CollectBrowserLogfile,
} from "../archive/CollectBrowserArchive";

export type CollectBrowserArgs = Args<
  {
    browserName: BrowserName;
    analyzeSyntaxArchivePath: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdCollectBrowser = async (args: CollectBrowserArgs) => {
  const {
    archive,
    processArgs: { concurrencyLimit },
    resolveArchivePath,
  } = initCommand(
    args,
    CollectBrowserArchive,
    new ChildInitCommandController(
      AnalyzeSyntaxArchive,
      (requireArgs) => requireArgs.analyzeSyntaxArchivePath,
      (requireArgs) => `CollectBrowser-${requireArgs.browserName}`,
      (
        requireArgs,
        { parentArchiveName, sitesState }
      ): CollectBrowserLogfile => {
        return {
          type: "CollectBrowserLogfile",
          browserName: requireArgs.browserName,
          analyzeSyntaxArchiveName: parentArchiveName,
          sitesState,
        };
      }
    )
  );

  const analyzeSyntaxArchive = AnalyzeSyntaxArchive.open(
    resolveArchivePath(archive.logfile.analyzeSyntaxArchiveName)
  );
  const recordArchive = RecordArchive.open(
    resolveArchivePath(analyzeSyntaxArchive.logfile.recordArchiveName)
  );

  await useMonitorBundle({}, async (bundlePath) => {
    const workerName = "collectBrowserSite";
    const pool = workerpool.pool(getWorkerFilename(workerName), {
      workerType: "process",
    });
    await processSites(
      new ArchiveProcessSitesController(archive),
      concurrencyLimit,
      async (site) => {
        const { archivePath } = archive;
        await retryOnce(async () => {
          await pool.exec(workerName, [
            {
              site,
              browserName: archive.logfile.browserName,
              archivePath,
              analyzeSyntaxArchivePath: analyzeSyntaxArchive.archivePath,
              recordArchivePath: recordArchive.archivePath,
              bundlePath,
            } satisfies CollectBrowserSiteArgs,
          ]);
        });
      }
    );
    await pool.terminate();
  });
};
