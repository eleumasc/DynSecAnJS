import {
  Args,
  getPrefixFromArchivePath,
  initCommand,
} from "../archive/initCommand";
import { callAgent, registerAgent } from "../util/thread";

import Archive from "../archive/Archive";
import { PrepareLogfile, PrepareSiteResult } from "../archive/PrepareLogfile";
import { RecordLogfile, RecordSiteResult } from "../archive/RecordLogfile";
import path from "path";
import { processSites } from "../util/processSites";
import { createSitesStateFrom } from "../util/SitesState";
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
    processArgs: { concurrencyLimit },
    requireArchive,
  } = initCommand(
    args,
    (requireArgs) =>
      getPrefixFromArchivePath(requireArgs.recordArchivePath, "Prepare"),
    (requireArgs): PrepareLogfile => {
      return {
        type: "PrepareLogfile",
        recordArchiveName: path.basename(requireArgs.recordArchivePath),
        sitesState: null,
      };
    }
  );

  const { archive: recordArchive, archivePath: recordArchivePath } =
    requireArchive<RecordLogfile>(
      archive.logfile.recordArchiveName,
      "RecordLogfile"
    );

  await processSites(
    {
      getInitialSitesState() {
        return (
          archive.logfile.sitesState ??
          createSitesStateFrom(recordArchive.logfile.sitesState)
        );
      },
      onSiteProcessed(_, sitesState) {
        const { logfile } = archive;
        archive.logfile = { ...logfile, sitesState };
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
