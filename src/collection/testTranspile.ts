import { AnalyzeSyntaxSiteDetail } from "../archive/AnalyzeSyntaxArchive";
import { SiteResult } from "../archive/Archive";
import WPRArchive from "../wprarchive/WPRArchive";
import assert from "assert";
import { isSuccess } from "../util/Completion";
import { readFileSync } from "fs";
import { transpile } from "./transpile";

async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 3);
  const [wprArchivePath, syntaxPath, outputPath] = args;

  const wprArchive = WPRArchive.fromFile(wprArchivePath);
  const analyzeSyntaxSiteResult = JSON.parse(
    readFileSync(syntaxPath).toString()
  ) as SiteResult<AnalyzeSyntaxSiteDetail>;
  assert(isSuccess(analyzeSyntaxSiteResult));
  const { value: syntax } = analyzeSyntaxSiteResult;

  const newWprArchive = await transpile(wprArchive, syntax);

  newWprArchive.toFile(outputPath);
}

main();
