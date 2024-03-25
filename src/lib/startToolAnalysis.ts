import ArchiveWriter, {
  AttachmentList,
  DefaultAttachmentList,
  PrefixAttachmentList,
} from "./ArchiveWriter";
import { Fallible, isSuccess } from "../util/Fallible";
import {
  ToolAnalysisResult,
  serializeToolAnalysisResult,
} from "./ToolAnalysis";
import { intersectSitelists, readSitelistFromFile } from "./sitelist";

import ArchiveReader from "./ArchiveReader";
import { createToolAnalysis } from "./createToolAnalysis";
import { deployAnalysis } from "./deployAnalysis";
import { deserializeOriginalAnalysisResult } from "./OriginalAnalysis";
import { resolve } from "path";

export interface ToolAnalysisArgs {
  toolName: string;
  originalArchivePath: string;
  intersectSitelistPath?: string;
  concurrencyLevel: number;
}

export const startToolAnalysis = async (args: ToolAnalysisArgs) => {
  const {
    toolName,
    originalArchivePath,
    intersectSitelistPath,
    concurrencyLevel,
  } = args;

  const analysisId = `${Date.now().toString()}-${toolName}`;
  console.log(`Analysis ID is ${analysisId}`);

  const originalArchive = new ArchiveReader(
    resolve(originalArchivePath),
    "original-analysis",
    deserializeOriginalAnalysisResult
  );
  const sitelist = intersectSitelistPath
    ? intersectSitelists(
        originalArchive.getSitelist(),
        readSitelistFromFile(intersectSitelistPath)
      )
    : originalArchive.getSitelist();
  console.log(sitelist);
  console.log(`${sitelist.length} sites`);

  const archive = new ArchiveWriter(
    resolve("results", analysisId),
    "tool-analysis",
    serializeToolAnalysisResult
  );

  await deployAnalysis(
    () => createToolAnalysis(toolName),
    { concurrencyLevel },
    sitelist.map((site, i) => async (analysis) => {
      console.log(`begin analysis ${site} [${i} / ${sitelist.length}]`);

      const originalLogfile = originalArchive.load(site);

      const attachmentList: AttachmentList = new PrefixAttachmentList(
        new DefaultAttachmentList(),
        `${site}-`
      );

      let result: Fallible<ToolAnalysisResult>;
      if (isSuccess(originalLogfile.data)) {
        const {
          val: { compatibility, wprArchiveFile, timeSeedMs },
        } = originalLogfile.data;
        const wprArchivePath = resolve(originalArchivePath, wprArchiveFile);
        result = await analysis.run({
          site,
          minimumESVersion: compatibility.minimumESVersion,
          wprArchivePath,
          timeSeedMs,
          attachmentList,
        });
      } else {
        const { reason } = originalLogfile.data;
        result = {
          status: "failure",
          reason: `original analysis failure: ${reason}`,
        };
      }

      archive.store(
        { site, kind: "tool-analysis", data: result },
        attachmentList
      );

      console.log(`end analysis ${site}`);
    })
  );

  console.log("THE END");
};
