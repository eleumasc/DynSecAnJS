import assert from "assert";
import workerpool from "workerpool";
import WPRArchive from "../wprarchive/WPRArchive";
import { getSyntax } from "../syntax/getSyntax";
import { isSuccess, toCompletion } from "../util/Completion";
import { RecordArchive } from "../archive/RecordArchive";
import { SiteResult } from "../archive/Archive";
import {
  AnalyzeSyntaxArchive,
  AnalyzeSyntaxSiteDetail,
} from "../archive/AnalyzeSyntaxArchive";

export interface AnalyzeSyntaxSiteArgs {
  site: string;
  archivePath: string;
  recordArchivePath: string;
}

export const analyzeSyntaxSite = async (
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

workerpool.worker({
  analyzeSyntaxSite,
});
