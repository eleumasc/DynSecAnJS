import assert from "assert";
import WPRArchive from "../wprarchive/WPRArchive";
import { isSuccess } from "../util/Completion";
import { PreanalyzeReport } from "../archive/PreanalyzeArchive";
import { readFileSync } from "fs";
import { SiteResult } from "../archive/Archive";
import { transpile } from "../collection/transpile";

async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 3);
  const [wprArchivePath, preanalyzeReportPath, outputPath] = args;

  const wprArchive = WPRArchive.fromFile(wprArchivePath);
  const preanalyzeSiteResult = JSON.parse(
    readFileSync(preanalyzeReportPath).toString()
  ) as SiteResult<PreanalyzeReport>;
  assert(isSuccess(preanalyzeSiteResult));
  const { value: preanalyzeReport } = preanalyzeSiteResult;

  const transformResult = await transpile()(wprArchive, preanalyzeReport);

  transformResult.newWPRArchive.toFile(outputPath);
  console.log(transformResult.scriptTransformErrorLogs);
}

main();
