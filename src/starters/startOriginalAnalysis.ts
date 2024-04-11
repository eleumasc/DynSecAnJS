import ArchiveWriter, {
  AttachmentList,
  DefaultAttachmentList,
  PrefixAttachmentList,
} from "../lib/ArchiveWriter";

import { deployAnalysis } from "../lib/deployAnalysis";
import { getOriginalAnalysis } from "../lib/getOriginalAnalysis";
import path from "path";
import { readSitelistFromFile } from "../core/sitelist";
import { serializeOriginalAnalysisResult } from "../lib/OriginalAnalysis";

export interface OriginalAnalysisArgs {
  browserName: string;
  sitelistPath: string;
  concurrencyLevel: number;
}

export const startOriginalAnalysis = async (args: OriginalAnalysisArgs) => {
  const { browserName, sitelistPath, concurrencyLevel } = args;

  const analysisId = `${Date.now().toString()}-orig-${browserName}`;
  console.log(`Analysis ID is ${analysisId}`);

  const sitelist = readSitelistFromFile(sitelistPath);
  console.log(sitelist);
  console.log(`${sitelist.length} sites`);

  const archive = new ArchiveWriter(
    path.resolve("results", analysisId),
    "original-analysis",
    serializeOriginalAnalysisResult
  );

  await deployAnalysis(
    getOriginalAnalysis(browserName),
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
