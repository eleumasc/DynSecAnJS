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
          info.compatibility?.predominantTraceExistance?.transparency;
        if (!transparency) {
          return false;
        }
        return !transparency.transparent;
      })
      .map(
        (info) =>
          info.compatibility!.predominantTraceExistance!.transparency!.diffTrace
            .uncaughtErrors
      ),
    [
      // ### UNCAUGHT ERRORS
      //
      // *** JALANGI
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
      /TypeError: Constructor is not a constructor/,
      /TypeError: Failed to execute 'observe' on 'MutationObserver'/,
      /TypeError: Cannot use 'in' operator to search for 'default' in undefined/,
      //
      // *** JEST
      // /Uncaught \[object Object\]/,
      // /TypeError: Cannot read properties of undefined/,
      // /ReferenceError: .* is not defined/,
      // /SyntaxError: Invalid or unexpected token/,
      // /SyntaxError: Invalid flags supplied to RegExp constructor '\[object Object\]'/,
      // /TypeError: rv\.l\.join is not a function/,
      // /SyntaxError: Unexpected token/,
      // /NetworkError: Failed to execute 'send' on 'XMLHttpRequest'/,
      //
      // *** IFTranspiler
      // /SyntaxError: Unexpected token/,
      // /SyntaxError: Invalid or unexpected token/,
      // /Error: Can't find variable .* in scope chain/,
      // /TypeError: Cannot read properties of undefined/,
      // /TypeError: Cannot set properties of undefined \(setting '_cf_chl_opt'\)/,
      // /ReferenceError: dCi is not defined/,
      // /SyntaxError: Unexpected string/,
      //
      // *** GIFC
      // /TypeError: Cannot read properties of undefined \(reading 'label'\)/,
      // /TypeError: Cannot read properties of undefined/,
      // /ReferenceError: .* is not defined/,
      // /TypeError: Cannot set properties of undefined/,
      // /SyntaxError: Invalid or unexpected token/,
      // /SyntaxError: Identifier .* has already been declared/,
      // /TypeError: membrane.leave\(\.\.\.\) is not a function/,
      // /SyntaxError: Strict mode code may not include a with statement/,
      // /Script error\./,
      // /TypeError: Object.defineProperty called on non-object/,
      // /SyntaxError: "undefined" is not valid JSON/,
      // /Uncaught \[object Object\]/,
      // /TypeError: .* is not a function/,
      // /TypeError: Cannot use 'in' operator to search for .* in undefined/,
      // /TypeError: membrane.leave\(\.\.\.\) is not a constructor/,
      // /TypeError: Invalid value used as weak map key/,
      // /DataCloneError: Failed to execute 'replaceState' on 'History': \[object Object\] could not be cloned\./,
      // /InvalidCharacterError: Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded\./,
      // /TypeError: Failed to execute 'getComputedStyle' on 'Window': parameter 1 is not of type 'Element'\./,
      // /TypeError: undefined is not iterable/,
      // /TypeError: .* on proxy: trap returned falsish for property .*/,
      // /TypeError: Illegal invocation/,
      // /TypeError: Cannot convert undefined or null to object/,
      // /TypeError: Failed to construct 'MutationObserver': parameter 1 is not of type 'Function'/,
      //
      // *** Linvail
      // /TypeError: Cannot read properties of undefined/,
      // /ReferenceError: .* is not defined/,
      // /TypeError: Cannot set properties of undefined/,
      // /SyntaxError: Invalid or unexpected token/,
      // /SyntaxError: Identifier .* has already been declared/,
      // /TypeError: membrane.leave\(\.\.\.\) is not a function/,
      // /SyntaxError: Strict mode code may not include a with statement/,
      // /Script error\./,
      // /TypeError: .* is not a function/,
      // /TypeError: membrane.leave\(\.\.\.\) is not a constructor/,
      // /TypeError: Invalid value used as weak map key/,
      // /DataCloneError: Failed to execute 'replaceState' on 'History': \[object Object\] could not be cloned\./,
      // /TypeError: .* on proxy: trap returned falsish for property .*/,
      // /TypeError: 'set' on proxy: trap returned truish for property 'window' which exists in the proxy target as a non-configurable and non-writable accessor property without a setter/,
      // /TypeError: Function.prototype.apply was called on undefined, which is a undefined and not a function/,
      // /SyntaxError: Unexpected identifier 'code'/,
      // /TypeError: Right-hand side of 'instanceof' is not an object/,
      // /TypeError: Assignment to constant variable\./,
      // /TypeError: Failed to execute 'atob' on 'Window': 1 argument required, but only 0 present./,
      // /TypeError: undefined is not a constructor/,
      //
    ]
  );
  console.log(transparencyIssuesReport);
  console.log(JSON.stringify(transparencyIssuesReport.matchedSetsCount));
};
