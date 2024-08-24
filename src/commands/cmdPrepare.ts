import {
  Args,
  getPrefixFromArchivePath,
  initCommand,
} from "../archive/initCommand";
import { callAgent, registerAgent } from "../util/thread";

import Archive from "../archive/Archive";
import { PrepareLogfile, PrepareSiteResult } from "../archive/PrepareLogfile";
import { RecordLogfile, RecordSiteResult } from "../archive/RecordLogfile";
import assert from "assert";
import path from "path";
import { processEachSite } from "../util/processEachSite";
import WPRArchive from "../wprarchive/WPRArchive";
import { isSuccess, toCompletion } from "../util/Completion";
import { getSyntax } from "../syntax/getSyntax";

export type PrepareArgs = Args<
  {
    recordArchivePath: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdPrepare = async (args: PrepareArgs) => {
  const {
    archive,
    deps: { recordArchiveName },
    processArgs: { concurrencyLimit },
    workingDirectory,
  } = initCommand<PrepareLogfile>()(
    args,
    (depsArgs) =>
      getPrefixFromArchivePath(depsArgs.recordArchivePath, "Prepare"),
    () => {
      return { type: "PrepareLogfile", sites: [] };
    },
    (depsArgs) => {
      const recordArchiveName = path.basename(depsArgs.recordArchivePath);
      return { recordArchiveName };
    }
  );

  const recordArchivePath = path.resolve(workingDirectory, recordArchiveName);
  const recordArchive = Archive.open<RecordLogfile>(recordArchivePath);
  assert(recordArchive.logfile.type === "RecordLogfile");

  await processEachSite(
    {
      getSites() {
        return recordArchive.logfile.sites;
      },
      getProcessedSites() {
        return archive.logfile.sites;
      },
      onSiteProcessed(site) {
        const { logfile } = archive;
        archive.logfile = {
          ...logfile,
          sites: [...logfile.sites, site],
        };
      },
    },
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      await callAgent(__filename, prepareSite.name, {
        site,
        archivePath,
        recordArchivePath,
      } satisfies PrepareSiteArgs);
    }
  );
};

interface PrepareSiteArgs {
  site: string;
  archivePath: string;
  recordArchivePath: string;
}

const prepareSite = async (args: PrepareSiteArgs): Promise<void> => {
  const { site, archivePath, recordArchivePath } = args;

  const archive = Archive.open<PrepareLogfile>(archivePath, true);

  const recordArchive = Archive.open<RecordLogfile>(recordArchivePath);
  const recordSiteResult = recordArchive.readData<RecordSiteResult>(
    `${site}.json`
  );

  const result: PrepareSiteResult = await toCompletion(async () => {
    if (!isSuccess(recordSiteResult)) {
      throw recordSiteResult.error;
    }

    const wprArchive = WPRArchive.fromFile(
      recordArchive.getFilePath(`${site}-archive.wprgo`)
    );

    const {
      value: { accessUrl, scriptUrls: knownExternalScriptUrls },
    } = recordSiteResult;
    return getSyntax(wprArchive, accessUrl, knownExternalScriptUrls);
  });

  archive.writeData(`${site}.json`, result);
};

registerAgent(() => [{ name: prepareSite.name, fn: prepareSite }]);
