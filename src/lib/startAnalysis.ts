import { Logfile } from "./Logfile";
import Archive, {
  AttachmentList,
  DefaultAttachmentList,
  PrefixAttachmentList,
} from "./Archive";
import { readSitelistFromFile } from "./sitelist";
import { selectExecutionAnalysis } from "./selectExecutionAnalysis";
import { JavaScriptVersion } from "./compatibility/JavaScriptVersion";
import { deployAnalysis } from "./deployAnalysis";
import { resolve } from "path";

export interface StartAnalysisArgs {
  toolName: string;
  sitelistPath: string;
  concurrencyLevel: number;
}

export const startAnalysis = async (args: StartAnalysisArgs) => {
  const { toolName, sitelistPath, concurrencyLevel } = args;

  const analysisId = Date.now().toString();
  console.log(`Analysis ID is ${analysisId}`);

  const sitelist = readSitelistFromFile(sitelistPath);
  console.log(sitelist);
  console.log(`${sitelist.length} sites`);

  const archive = new Archive(resolve("results", analysisId));

  await deployAnalysis(
    () => selectExecutionAnalysis(toolName),
    { concurrencyLevel },
    sitelist.map((site, i) => async (analysis) => {
      console.log(`begin analysis ${site} [${i} / ${sitelist.length}]`);

      const attachmentList: AttachmentList = new PrefixAttachmentList(
        new DefaultAttachmentList(),
        `${site}-`
      );

      const result = await analysis.run({
        site,
        minimumJavaScriptVersion: JavaScriptVersion.ES5, // TODO: read from CompatibilityAnalysisResult
        wprArchivePath: "", // TODO: read from CompatibilityAnalysisResult
        attachmentList,
      });

      archive.store(
        <Logfile>{ site, kind: "execution", result },
        attachmentList
      );

      console.log(`end analysis ${site}`);
    })
  );

  console.log("THE END");
};
