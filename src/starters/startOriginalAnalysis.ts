import ArchiveWriter, {
  AttachmentList,
  DefaultAttachmentList,
  PrefixAttachmentList,
} from "../lib/ArchiveWriter";

import { createOriginalAnalysis } from "../lib/createOriginalAnalysis";
import { deployAnalysis } from "../lib/deployAnalysis";
import { readSitelistFromFile } from "../core/sitelist";
import { resolve } from "path";
import { serializeOriginalAnalysisResult } from "../lib/OriginalAnalysis";

export interface OriginalAnalysisArgs {
  sitelistPath: string;
  concurrencyLevel: number;
}

export const startOriginalAnalysis = async (args: OriginalAnalysisArgs) => {
  const { sitelistPath, concurrencyLevel } = args;

  const analysisId = `${Date.now().toString()}-orig`;
  console.log(`Analysis ID is ${analysisId}`);

  const sitelist = readSitelistFromFile(sitelistPath);
  console.log(sitelist);
  console.log(`${sitelist.length} sites`);

  const archive = new ArchiveWriter(
    resolve("results", analysisId),
    "original-analysis",
    serializeOriginalAnalysisResult
  );

  await deployAnalysis(
    () => createOriginalAnalysis(),
    { concurrencyLevel },
    sitelist.map((site, i) => async (analysis) => {
      console.log(`begin analysis ${site} [${i} / ${sitelist.length}]`);

      const attachmentList: AttachmentList = new PrefixAttachmentList(
        new DefaultAttachmentList(),
        `${site}-`
      );

      const result = await analysis.run({
        site,
        attachmentList,
      });

      archive.store(
        { site, kind: "original-analysis", data: result },
        attachmentList
      );

      console.log(`end analysis ${site}`);
    })
  );

  console.log("THE END");
};
