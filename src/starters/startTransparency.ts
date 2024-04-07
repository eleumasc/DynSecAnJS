import {
  intersectSitelists,
  intersectSitelistsFromFile,
} from "../core/sitelist";

import ArchiveReader from "../lib/ArchiveReader";
import { countSetsAndFilterStrings } from "../measurement/util";
import { createReport } from "../measurement/Report";
import { deserializeOriginalAnalysisResult } from "../lib/OriginalAnalysis";
import { deserializeToolAnalysisResult } from "../lib/ToolAnalysis";
import { getSiteInfo } from "../measurement/SiteInfo";

export interface TransparencyArgs {
  originalArchivePath: string;
  toolArchivePath: string;
  intersectSitelistPath?: string;
}

export const startTransparency = async (args: TransparencyArgs) => {
  const { originalArchivePath, toolArchivePath, intersectSitelistPath } = args;

  const originalArchive = new ArchiveReader(
    originalArchivePath,
    "original-analysis",
    deserializeOriginalAnalysisResult
  );
  const originalSitelist = originalArchive.getSitelist();
  const toolArchive = new ArchiveReader(
    toolArchivePath,
    "tool-analysis",
    deserializeToolAnalysisResult
  );
  const toolSitelist = toolArchive.getSitelist();
  const bothSitelist = intersectSitelistsFromFile(
    intersectSitelists(originalSitelist, toolSitelist),
    intersectSitelistPath
  );

  const siteInfos = bothSitelist.map((site) => {
    const originalLogfile = originalArchive.load(site);
    const toolLogfile = toolArchive.load(site);
    return getSiteInfo(site, originalLogfile.data, toolLogfile.data);
  });

  const report = createReport(siteInfos);
  console.log(report);

  const transparencyIssuesReport = countSetsAndFilterStrings(
    siteInfos
      .filter((info) => {
        const transparency =
          info.compatibility?.loadingCompleteness?.predominantTraceExistance
            ?.transparency;
        if (!transparency) {
          return false;
        }
        return !transparency.transparent;
      })
      .map(
        (info) =>
          info.compatibility!.loadingCompleteness!.predominantTraceExistance!
            .transparency!.uncaughtErrors
      ),
    [
      /ReferenceError: Constructor is not defined/,
      /TypeError: Cannot read properties of null/,
      /TypeError: Cannot set properties of undefined/,
      /SyntaxError: Unexpected eval or arguments in strict mode/,
      /TypeError: val.hasOwnProperty is not a function/,
      /ReferenceError: .* is not defined/,
      /EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive/,
      /TypeError: returnStack.push is not a function/,
      /TypeError: sidStack.push is not a function/,
      /^Script error\.$/,
      /TypeError: Cannot read properties of undefined/,
      /NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'/,
      /TypeError: Function\.prototype\.apply was called on .*, which is an object and not a function/,
      /SyntaxError: Unexpected token/,
      /ResizeObserver loop completed with undelivered notifications\./,
      /SyntaxError: Unexpected token .* is not valid JSON/,
      /RangeError: Invalid string length/,
      /AjaxError:/,
      /TypeError: .* is not a function/,
      /TypeError: J\$.* is not a function/,
      /http[s]?:\/\/requirejs\.org\/docs\/errors.html\#scripterror/,
      /SyntaxError: Identifier .* has already been declared/,
      /Error: Bootstrap tooltips require Tether/,
      /TypeError: object null is not iterable/,
      /ReferenceError: Cannot access .* before initialization/,
      /google.ads.domains.Caf: Constructor is not defined/,
      /TypeError: Illegal invocation/,
      /Error: Syntax error\, unrecognized expression/,
      /Uncaught \[object Object\]/,
      /Uncaught TypeError: Constructor is not a constructor/,
      /Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver'/,
      /Uncaught TypeError: Cannot use 'in' operator to search for 'default' in undefined/,
    ]
  );
  console.log(transparencyIssuesReport);
  console.log(JSON.stringify(transparencyIssuesReport.matchedSetsCount));
};
