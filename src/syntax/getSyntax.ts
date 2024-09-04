import _ from "lodash";
import acorn from "acorn";
import assert from "assert";
import DataURL from "../util/DataURL";
import HtmlDocument from "../htmlutil/HTMLDocument";
import walk from "acorn-walk";
import WPRArchive from "../wprarchive/WPRArchive";
import { AttributeHtmlScript, ElementHtmlScript } from "../htmlutil/HTMLScript";
import { dropHash } from "../util/url";
import { getDiffEvidences } from "./getDiffEvidences";
import { ImportMap } from "../util/import-map";
import { isJavaScriptMimeType } from "../util/mimeType";
import { isOk } from "../wprarchive/ArchivedResponse";
import { maxESVersion } from "./ESVersion";
import { md5 } from "../util/hash";
import {
  ModuleDetail,
  Syntax,
  SyntaxDetail,
  SyntaxScript
  } from "./Syntax";

export const getSyntax = (
  wprArchive: WPRArchive,
  accessUrl: string,
  knownExternalScriptUrls: string[]
): Syntax => {
  const { url: mainUrl, response: mainResponse } =
    wprArchive.getRequest(accessUrl);
  assert(
    isOk(mainResponse),
    `Navigation request resolved to response with status code ${mainResponse.statusCode}`
  );

  const htmlDocument = HtmlDocument.parse(mainResponse.body.toString());
  const htmlScripts = htmlDocument.activeScripts;

  const documentUrl = (
    htmlDocument.baseUrl !== undefined
      ? new URL(htmlDocument.baseUrl, mainUrl)
      : mainUrl
  ).toString();

  const importMap =
    htmlDocument.rawImportMap !== undefined
      ? new ImportMap({
          mapUrl: documentUrl,
          map: JSON.parse(htmlDocument.rawImportMap),
        })
      : new ImportMap(documentUrl);

  const errors: string[] = [];
  const externalScriptUrls = new Set<string>();
  const analyzerState: ScriptSyntaxAnalyzerState = {
    wprArchive,
    importMap,
    externalScriptUrls,
  };
  const processAnalyzerQueue = (
    analyzerQueue: ScriptSyntaxAnalyzer[]
  ): SyntaxScript[] => {
    const result: SyntaxScript[] = [];
    for (let analyzer; (analyzer = analyzerQueue.shift()) !== undefined; ) {
      let script;
      try {
        script = analyzer(analyzerState);
      } catch (e) {
        errors.push(String(e));
        script = null;
      }
      if (!script) continue;
      result.push(script);

      if (script.isModule) {
        for (const importUrl of Object.values(script.importUrlMap)) {
          analyzerQueue.push(analyzeExternalScript(importUrl, true));
        }
      }
    }
    return result;
  };

  const scriptUrlMap: Record<string, string> = Object.fromEntries(
    htmlScripts
      .filter(
        (htmlScript): htmlScript is ElementHtmlScript =>
          htmlScript instanceof ElementHtmlScript && htmlScript.isExternal
      )
      .map((htmlScript) => {
        const { src } = htmlScript;
        const url = dropHash(new URL(src, documentUrl).toString());
        return [src, url];
      })
  );

  let scripts = processAnalyzerQueue(
    htmlScripts.map((htmlScript): ScriptSyntaxAnalyzer => {
      if (htmlScript instanceof ElementHtmlScript) {
        const { isExternal, isModule } = htmlScript;
        if (isExternal) {
          const url = scriptUrlMap[htmlScript.src];
          assert(url !== undefined);
          return analyzeExternalScript(url, isModule);
        } else {
          return analyzeInlineScript(htmlScript.inlineSource, isModule);
        }
      } else if (htmlScript instanceof AttributeHtmlScript) {
        return analyzeEventHandler(htmlScript.inlineSource);
      } else {
        throw new Error("Unknown type of HtmlScript"); // This should never happen
      }
    })
  );

  const residualScriptUrls = _.difference(
    knownExternalScriptUrls.map((url) => dropHash(url)),
    [...externalScriptUrls]
  );

  scripts = scripts.concat(
    processAnalyzerQueue(
      residualScriptUrls.map((scriptUrl) =>
        analyzeExternalScript(scriptUrl, undefined)
      )
    )
  );

  return {
    mainUrl: mainUrl.toString(),
    minimumESVersion: maxESVersion(
      scripts.map((script) => script.minimumESVersion)
    ),
    scriptUrlMap,
    scripts,
    errors,
  };
};

interface ScriptSyntaxAnalyzerState {
  wprArchive: WPRArchive;
  importMap: ImportMap;
  externalScriptUrls: Set<string>;
}

type ScriptSyntaxAnalyzer = (
  state: ScriptSyntaxAnalyzerState
) => SyntaxScript | null;

const analyzeExternalScript =
  (url: string, isModule: boolean | undefined): ScriptSyntaxAnalyzer =>
  (state) => {
    const { wprArchive, importMap, externalScriptUrls } = state;

    if (url.startsWith("data:")) {
      const { content, mimeType: type } = DataURL.parse(url);
      assert(isModule !== undefined);
      assert(type === undefined || isJavaScriptMimeType(type));
      return analyzeInlineScript(content.toString(), isModule)(state);
    }

    if (!url.startsWith("http:") && !url.startsWith("https:")) {
      return null;
    }

    if (externalScriptUrls.has(url)) {
      return null;
    }
    externalScriptUrls.add(url);

    try {
      const response = wprArchive.getRequest(url, true).response;
      assert(isOk(response));
      const source = response.body.toString();
      const { program, isModuleComputed } = (() => {
        if (isModule !== undefined) {
          const program = parseJavascript(source, isModule);
          return { program, isModuleComputed: isModule };
        } else {
          try {
            const program = parseJavascript(source);
            return { program, isModuleComputed: false };
          } catch {
            const program = parseJavascript(source, true);
            return { program, isModuleComputed: true };
          }
        }
      })();
      return {
        type: "external",
        url,
        ...getSyntaxDetail(program),
        ...getModuleDetail(isModuleComputed, program, importMap, url),
      };
    } catch (e) {
      throw `[${url}] ${e}`;
    }
  };

const analyzeInlineScript =
  (source: string, isModule: boolean): ScriptSyntaxAnalyzer =>
  (state) => {
    const { importMap } = state;

    const program = parseJavascript(source, isModule);
    return {
      type: "inline",
      hash: md5(source),
      ...getSyntaxDetail(program),
      ...getModuleDetail(isModule, program, importMap),
      isEventHandler: false,
    };
  };

const analyzeEventHandler =
  (source: string): ScriptSyntaxAnalyzer =>
  () => {
    const program = parseJavascript(source, undefined, true);
    return {
      type: "inline",
      hash: md5(source),
      ...getSyntaxDetail(program),
      isModule: false,
      isEventHandler: true,
    };
  };

const parseJavascript = (
  input: string,
  isModule?: boolean,
  isEventHandler?: boolean
): acorn.Program => {
  return acorn.parse(input, {
    ecmaVersion: 2022,
    sourceType: isModule ?? false ? "module" : "script",
    allowReturnOutsideFunction: isEventHandler ?? false,
  });
};

const getSyntaxDetail = (program: acorn.Program): SyntaxDetail => {
  const features = _.uniq(
    getDiffEvidences(program).map(({ feature }) => feature)
  );
  return {
    features: features.map((feature) => feature.toString()),
    minimumESVersion: maxESVersion(
      features.map((feature) => feature.esVersion)
    ),
  };
};

const getModuleDetail = (
  isModule: boolean,
  program: acorn.Program,
  importMap: ImportMap,
  parentUrl?: string
): ModuleDetail => {
  if (!isModule) {
    return { isModule };
  }

  const importSrcs: string[] = [];
  walk.simple(program, {
    ImportDeclaration(node) {
      const { value } = node.source;
      assert(typeof value === "string");
      importSrcs.push(value);
    },
  });
  const importUrlMap = Object.fromEntries(
    importSrcs.map((importSrc) => [
      importSrc,
      dropHash(importMap.resolve(importSrc, parentUrl)),
    ])
  );
  return { isModule, importUrlMap };
};
