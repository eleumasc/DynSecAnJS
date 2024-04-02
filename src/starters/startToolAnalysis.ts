import ArchiveWriter, {
  AttachmentList,
  DefaultAttachmentList,
  PrefixAttachmentList,
} from "../lib/ArchiveWriter";
import { Fallible, isSuccess } from "../core/Fallible";
import {
  ToolAnalysisResult,
  serializeToolAnalysisResult,
} from "../lib/ToolAnalysis";

import ArchiveReader from "../lib/ArchiveReader";
import { deployAnalysis } from "../lib/deployAnalysis";
import { deserializeOriginalAnalysisResult } from "../lib/OriginalAnalysis";
import { getToolAnalysisFactory } from "../lib/ToolAnalysisFactory";
import { intersectSitelistsFromFile } from "../core/sitelist";
import path from "path";

export interface ToolAnalysisArgs {
  toolName: string;
  originalArchivePath: string;
  intersectSitelistPath?: string;
  concurrencyLevel: number;
  preAnalysis: boolean;
}

export const startToolAnalysis = async (args: ToolAnalysisArgs) => {
  const {
    toolName,
    originalArchivePath,
    intersectSitelistPath,
    concurrencyLevel,
    preAnalysis,
  } = args;

  const analysisId =
    `${Date.now().toString()}-${toolName}` + (preAnalysis ? "-pre" : "");
  console.log(`Analysis ID is ${analysisId}`);

  const originalArchive = new ArchiveReader(
    path.resolve(originalArchivePath),
    "original-analysis",
    deserializeOriginalAnalysisResult
  );
  const sitelist = intersectSitelistsFromFile(
    originalArchive.getSitelist(),
    intersectSitelistPath
  );
  console.log(sitelist);
  console.log(`${sitelist.length} sites`);

  const archive = new ArchiveWriter(
    path.resolve("results", analysisId),
    "tool-analysis",
    serializeToolAnalysisResult
  );

  const analysisFactory = getToolAnalysisFactory(toolName, preAnalysis);
  await deployAnalysis(
    analysisFactory,
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
        const wprArchivePath = path.resolve(
          originalArchivePath,
          wprArchiveFile
        );
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
