import { AttributeHtmlScript, ElementHtmlScript } from "../html/HTMLScript";
import {
  ModuleDetail,
  ScriptSyntax,
  SiteSyntax,
  SyntaxDetail,
} from "./SiteSyntax";

import HtmlDocument from "../html/HTMLDocument";
import WPRArchive from "../wprarchive/WPRArchive";
import _ from "lodash";
import acorn from "acorn";
import assert from "assert";
import { dropHash } from "../util/url";
import walk from "acorn-walk";
import { getDiffEvidences } from "./getDiffEvidences";
import { maxESVersion } from "./ESVersion";

export const getSiteSyntax = (
  wprArchive: WPRArchive,
  accessUrl: string
): SiteSyntax => {
  const mainRequest = wprArchive.resolveRequest(accessUrl);
  assert(
    mainRequest.headers.get("content-type")?.toLowerCase().includes("html") ??
      true
  );

  const htmlDocument = HtmlDocument.parse(mainRequest.response.body.toString());
  const documentUrl = dropHash(
    (htmlDocument.baseHref !== undefined
      ? new URL(htmlDocument.baseHref, mainRequest.url)
      : mainRequest.url
    ).toString()
  );

  const analyzerQueue = htmlDocument.scriptList
    .filter(
      (script) => !(script instanceof ElementHtmlScript && script.isNoModule)
    )
    .map((htmlScript): ScriptSyntaxAnalyzer => {
      if (htmlScript instanceof ElementHtmlScript) {
        const { isExternal, isModule } = htmlScript;
        if (isExternal) {
          return analyzeExternalScript(
            dropHash(new URL(htmlScript.src, documentUrl).toString()),
            isModule
          );
        } else {
          return analyzeInlineScript(
            htmlScript.inlineSource,
            documentUrl,
            isModule
          );
        }
      } else if (htmlScript instanceof AttributeHtmlScript) {
        const { inlineSource: source } = htmlScript;
        return analyzeEventHandler(source, documentUrl);
      } else {
        throw new Error("Unsupported HTMLScript"); // This should never happen
      }
    });

  const scripts = <ScriptSyntax[]>[];
  const analyzedExternalUrls = new Set<string>();
  const analyzerState = <ScriptSyntaxAnalyzerState>{
    wprArchive,
    analyzedExternalUrls,
  };
  for (let analyzer; (analyzer = analyzerQueue.shift()) !== undefined; ) {
    const script = analyzer(analyzerState);
    if (!script) continue;
    scripts.push(script);
    if (script.type === "external") {
      analyzedExternalUrls.add(script.scriptUrl);
    }
    if (script.isModule) {
      for (const importUrl of script.importUrls) {
        analyzerQueue.push(analyzeExternalScript(importUrl, true));
      }
    }
  }

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
  analyzedExternalUrls: Set<string>;
}

type ScriptSyntaxAnalyzer = (
  state: ScriptSyntaxAnalyzerState
) => ScriptSyntax | null;

const analyzeExternalScript =
  (scriptUrl: string, isModule: boolean): ScriptSyntaxAnalyzer =>
  ({ wprArchive, analyzedExternalUrls: analyzedExternalUrls }) => {
    // TODO: handle data URLs

    if (analyzedExternalUrls.has(scriptUrl)) {
      return null;
    }

    const program = parseJavascript(
      wprArchive.resolveRequest(scriptUrl).response.body.toString(),
      isModule
    );
    return {
      type: "external",
      scriptUrl,
      ...getSyntaxDetail(program),
      ...getModuleDetail(isModule, program, scriptUrl),
    };
  };

const analyzeInlineScript =
  (
    source: string,
    documentUrl: string,
    isModule: boolean
  ): ScriptSyntaxAnalyzer =>
  () => {
    const program = parseJavascript(source, isModule);
    return {
      type: "inline",
      scriptUrl: documentUrl,
      ...getSyntaxDetail(program),
      ...getModuleDetail(isModule, program, documentUrl),
      isEventHandler: false,
    };
  };

const analyzeEventHandler =
  (source: string, documentUrl: string): ScriptSyntaxAnalyzer =>
  () => {
    const program = parseJavascript(source, undefined, true);
    return {
      type: "inline",
      scriptUrl: documentUrl,
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
  scriptUrl: string
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
    dropHash(new URL(importSrc, scriptUrl).toString())
  );
  return { isModule, importUrls };
};
