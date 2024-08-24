import { AttributeHtmlScript, ElementHtmlScript } from "../html/HTMLScript";
import { ModuleDetail, SyntaxScript, Syntax, SyntaxDetail } from "./Syntax";

import HtmlDocument from "../html/HTMLDocument";
import WPRArchive from "../wprarchive/WPRArchive";
import _ from "lodash";
import acorn from "acorn";
import assert from "assert";
import walk from "acorn-walk";
import { getDiffEvidences } from "./getDiffEvidences";
import { maxESVersion } from "./ESVersion";
import { isJavaScriptMimeType } from "../util/mimeType";
import DataURL from "../util/DataURL";
import { IImportMap, ImportMap } from "../util/import-map";
import { dropHash } from "../util/url";
import { md5 } from "../util/hash";
import { isOk } from "../wprarchive/ArchivedResponse";

export const getSyntax = (
  wprArchive: WPRArchive,
  accessUrl: string,
  knownExternalScriptUrls: string[]
): Syntax => {
  const { url: mainUrl, response: mainResponse } =
    wprArchive.resolveRequest(accessUrl);
  assert(
    isOk(mainResponse),
    `Navigation request resolved to response with status code ${mainResponse.statusCode}`
  );

  assert(
    mainResponse.headers.get("content-type")?.includes("html") ?? true,
    `Navigation request resolved to response with content type different from HTML`
  );
  const htmlDocument = HtmlDocument.parse(mainResponse.body.toString());

  const documentUrl = (
    htmlDocument.baseUrl !== undefined
      ? new URL(htmlDocument.baseUrl, mainUrl)
      : mainUrl
  ).toString();

  const importMap =
    htmlDocument.rawImportMap !== undefined
      ? new ImportMap({
          mapUrl: documentUrl,
          map: JSON.stringify(htmlDocument.rawImportMap) as IImportMap,
        })
      : new ImportMap(documentUrl);

  const externalScriptUrls = new Set<string>();
  const analyzerState: ScriptSyntaxAnalyzerState = {
    wprArchive,
    importMap,
    externalScriptUrls,
  };
  const processAnalyzerQueue = (
    analyzerQueue: ScriptSyntaxAnalyzer[]
  ): SyntaxScript[] => {
    const result = <SyntaxScript[]>[];
    for (let analyzer; (analyzer = analyzerQueue.shift()) !== undefined; ) {
      const script = analyzer(analyzerState);
      if (!script) continue;
      result.push(script);

      if (script.isModule) {
        for (const importUrl of script.importUrls) {
          analyzerQueue.push(
            analyzeExternalScript(
              importUrl,
              true,
              script.type === "external" ? script.dynamicLoading : false
            )
          );
        }
      }
    }
    return result;
  };

  const staticScripts = processAnalyzerQueue(
    htmlDocument.scriptList
      .filter(
        (script) => !(script instanceof ElementHtmlScript && script.isNoModule)
      )
      .map((htmlScript): ScriptSyntaxAnalyzer => {
        if (htmlScript instanceof ElementHtmlScript) {
          const { isExternal, isModule } = htmlScript;
          if (isExternal) {
            return analyzeExternalScript(
              dropHash(new URL(htmlScript.src, documentUrl).toString()),
              isModule,
              false
            );
          } else {
            return analyzeInlineScript(htmlScript.inlineSource, isModule);
          }
        } else if (htmlScript instanceof AttributeHtmlScript) {
          const { inlineSource: source } = htmlScript;
          return analyzeEventHandler(source);
        } else {
          throw new Error("Unsupported HTMLScript"); // This should never happen
        }
      })
  );

  const dynamicLoadingExternalScriptUrls = _.difference(
    knownExternalScriptUrls,
    [...externalScriptUrls]
  );

  const dynScripts = processAnalyzerQueue(
    dynamicLoadingExternalScriptUrls.map((scriptUrl) =>
      analyzeExternalScript(scriptUrl, undefined, true)
    )
  );

  const scripts = [...staticScripts, ...dynScripts];

  return {
    documentUrl,
    minimumESVersion: maxESVersion(
      scripts.map((script) => script.minimumESVersion)
    ),
    scripts,
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
  (
    url: string,
    isModule: boolean | undefined,
    dynamicLoading: boolean
  ): ScriptSyntaxAnalyzer =>
  (state) => {
    const { wprArchive, importMap, externalScriptUrls } = state;

    if (url.startsWith("blob:") || url.startsWith("chrome-extension:")) {
      return null;
    }

    if (url.startsWith("data:")) {
      const { content, mimeType: type } = DataURL.parse(url);
      assert(type === undefined || isJavaScriptMimeType(type));
      return analyzeInlineScript(content.toString(), type === "module")(state);
    }

    if (externalScriptUrls.has(url)) {
      return null;
    }
    externalScriptUrls.add(url);

    const response = wprArchive.resolveRequest(url, true).response;
    if (!isOk(response)) {
      return null;
    }
    const source = response.body.toString();
    const { program, isModuleComputed } = (() => {
      if (isModule !== undefined) {
        const program = parseJavascript(source, isModule);
        return { program, isModuleComputed: isModule };
      } else {
        try {
          const program = parseJavascript(source);
          return { program, isModuleComputed: false };
        } catch (e) {
          try {
            const program = parseJavascript(source, true);
            return { program, isModuleComputed: true };
          } catch {
            throw e;
          }
        }
      }
    })();
    return {
      type: "external",
      url,
      ...getSyntaxDetail(program),
      ...getModuleDetail(isModuleComputed, program, importMap, url),
      dynamicLoading,
    };
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

  const importSrcs = <string[]>[];
  walk.simple(program, {
    ImportDeclaration(node) {
      const { value } = node.source;
      assert(typeof value === "string");
      importSrcs.push(value);
    },
  });
  const importUrls = importSrcs.map((importSrc) =>
    dropHash(importMap.resolve(importSrc, parentUrl))
  );
  return { isModule, importUrls };
};
