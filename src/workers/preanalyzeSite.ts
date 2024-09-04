import assert from "assert";
import WPRArchive from "../wprarchive/WPRArchive";
import { getSyntax } from "../syntax/getSyntax";
import { isSuccess, toCompletion } from "../util/Completion";
import { RecordArchive } from "../archive/RecordArchive";
import { SiteResult } from "../archive/Archive";
import { threadRegister } from "../util/thread";
import {
  PreanalyzeArchive,
  PreanalyzeReport,
} from "../archive/PreanalyzeArchive";

export interface PreanalyzeSiteArgs {
  site: string;
  archivePath: string;
  recordArchivePath: string;
}

export const preanalyzeSiteFilename = __filename;

const preanalyzeSite = async (args: PreanalyzeSiteArgs): Promise<void> => {
  const { site, archivePath, recordArchivePath } = args;

  const archive = PreanalyzeArchive.open(archivePath, true);

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

  archive.writeSiteResult(site, result satisfies SiteResult<PreanalyzeReport>);
};

threadRegister(preanalyzeSite);
