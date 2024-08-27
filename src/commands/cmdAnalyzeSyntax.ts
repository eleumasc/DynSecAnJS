import {
  initCommand,
  ChildInitCommandController,
} from "../archive/initCommand";
import { Args } from "../archive/Args";

import {
  AnalyzeSyntaxArchive,
  AnalyzeSyntaxLogfile,
  AnalyzeSyntaxSiteDetail,
} from "../archive/AnalyzeSyntaxArchive";
import { RecordArchive } from "../archive/RecordArchive";
import {
  ArchiveProcessSitesController,
  processSites,
} from "../util/processSites";
import WPRArchive from "../wprarchive/WPRArchive";
import { isSuccess, toCompletion } from "../util/Completion";
import { getSyntax } from "../syntax/getSyntax";
import assert from "assert";
import { SiteResult } from "../archive/Archive";
import {
  callThreadCallback,
  isChildThread,
  registerThreadCallback,
} from "../util/thread";

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
      await callThreadCallback(__filename, analyzeSyntaxSite.name, {
        site,
        archivePath,
        recordArchivePath: recordArchive.archivePath,
      } satisfies AnalyzeSyntaxSiteArgs);
    }
  );
};

interface AnalyzeSyntaxSiteArgs {
  site: string;
  archivePath: string;
  recordArchivePath: string;
}

const analyzeSyntaxSite = async (
  args: AnalyzeSyntaxSiteArgs
): Promise<void> => {
  const { site, archivePath, recordArchivePath } = args;

  const archive = AnalyzeSyntaxArchive.open(archivePath, true);

  const recordArchive = RecordArchive.open(recordArchivePath);
  const recordSiteResult = recordArchive.readSiteResult(site);

  const result = await toCompletion(async () => {
    assert(isSuccess(recordSiteResult));
    const {
      value: { accessUrl, scriptUrls: knownExternalScriptUrls },
    } = recordSiteResult;

    const wprArchive = WPRArchive.fromFile(
      recordArchive.getFilePath(`${site}-archive.wprgo`)
    );

    return getSyntax(wprArchive, accessUrl, knownExternalScriptUrls);
  });

  archive.writeSiteResult(
    site,
    result satisfies SiteResult<AnalyzeSyntaxSiteDetail>
  );
};

if (isChildThread) {
  registerThreadCallback(() => [
    { name: analyzeSyntaxSite.name, fn: analyzeSyntaxSite },
  ]);
}
