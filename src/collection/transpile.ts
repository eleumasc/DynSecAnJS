import _ from "lodash";
import ArchivedRequest from "../wprarchive/ArchivedRequest";
import assert from "assert";
import DataURL from "../util/DataURL";
import HtmlDocument from "../htmlutil/HTMLDocument";
import WPRArchive from "../wprarchive/WPRArchive";
import { AttributeHtmlScript, ElementHtmlScript } from "../htmlutil/HTMLScript";
import { BrowserPackEntry, bundleModule } from "./bundleModule";
import { isJavaScriptMimeType } from "../util/mimeType";
import { md5 } from "../util/hash";
import { Syntax, SyntaxScript } from "../syntax/Syntax";
import { transformSync } from "@babel/core";

export const transpile = async (
  wprArchive: WPRArchive,
  syntax: Syntax
): Promise<WPRArchive> => {
  const { mainUrl, scriptUrlMap, scripts } = syntax;

  const transpileJavascript = async (
    source: string,
    isEventHandler: boolean = false
  ): Promise<string> => {
    return transformSync(source, {
      parserOpts: {
        sourceType: "script",
        allowReturnOutsideFunction: isEventHandler,
      },
      presets: ["@babel/preset-env"],
      plugins: ["@babel/plugin-transform-modules-commonjs"],
    })!.code!;
  };

  const generateRequire = (moduleName: string) =>
    `window["\$__require"](${JSON.stringify(moduleName)});`;

  const transpileScript = async (
    script: SyntaxScript | undefined,
    scriptId: string,
    getSource: () => string
  ): Promise<string> => {
    return script
      ? script.isModule
        ? generateRequire(scriptId)
        : await transpileJavascript(getSource())
      : "";
  };

  const transpileExternalScript = (
    scriptUrl: string,
    getSource: () => string
  ): Promise<string> =>
    transpileScript(
      scripts.find(
        (script) => script.type === "external" && script.url === scriptUrl
      ),
      scriptUrl,
      getSource
    );

  const transpileInlineScript = (
    scriptHash: string,
    getSource: () => string
  ): Promise<string> =>
    transpileScript(
      scripts.find(
        (script) => script.type === "inline" && script.hash === scriptHash
      ),
      scriptHash,
      getSource
    );

  const transpileHtml = async (htmlSource: string): Promise<string> => {
    const htmlDocument = HtmlDocument.parse(htmlSource);
    const htmlScripts = htmlDocument.scriptList.filter(
      (script) => !(script instanceof ElementHtmlScript && script.isNoModule)
    );

    for (const htmlScript of htmlScripts) {
      if (htmlScript instanceof ElementHtmlScript) {
        htmlScript.integrity = undefined;
        htmlScript.isAsync = false;

        if (htmlScript.isModule) {
          htmlScript.isModule = false;
          htmlScript.isDefer = true;
        }

        if (htmlScript.isExternal) {
          const scriptUrl = scriptUrlMap[htmlScript.src];
          assert(scriptUrl !== undefined);

          if (scriptUrl.startsWith("data:")) {
            const { content, mimeType: type } = DataURL.parse(scriptUrl);
            assert(type === undefined || isJavaScriptMimeType(type));
            htmlScript.inlineSource = content.toString();
          }
        }
      }
    }

    const mbEntries = scripts.flatMap((script): BrowserPackEntry[] => {
      if (!script.isModule) return [];

      if (script.type === "external") {
        const scriptRequest = wprArchive.tryGetRequest(script.url);
        if (!scriptRequest) return [];

        return [
          {
            id: script.url,
            source: scriptRequest.response.body.toString(),
            deps: script.importUrlMap,
          },
        ];
      } else {
        const htmlScript = htmlScripts.find(
          (htmlScript): htmlScript is ElementHtmlScript =>
            htmlScript instanceof ElementHtmlScript &&
            htmlScript.isInline &&
            script.hash === md5(htmlScript.inlineSource)
        );
        assert(htmlScript);

        return [
          {
            id: script.hash,
            source: htmlScript.inlineSource,
            deps: script.importUrlMap,
          },
        ];
      }
    });

    for (const htmlScript of htmlScripts) {
      if (htmlScript instanceof ElementHtmlScript) {
        if (htmlScript.isInline) {
          const scriptHash = md5(htmlScript.inlineSource);

          htmlScript.inlineSource = await transpileInlineScript(
            scriptHash,
            () => htmlScript.inlineSource
          );
        }
      } else if (htmlScript instanceof AttributeHtmlScript) {
        htmlScript.inlineSource = await transpileJavascript(
          htmlScript.inlineSource,
          true
        );
      } else {
        throw new Error("Unknown type of HtmlScript"); // This should never happen
      }
    }

    if (mbEntries.length > 0) {
      const mbHtmlScript = htmlDocument.createInitHtmlScript();
      mbHtmlScript.isDefer = true;
      mbHtmlScript.inlineSource = await transpileJavascript(
        await bundleModule(mbEntries)
      );
    }

    return htmlDocument.serialize();
  };

  let newWprArchive = wprArchive;

  const mainRequest = wprArchive.getRequest(mainUrl);
  newWprArchive = newWprArchive.editResponseBody(
    mainRequest,
    Buffer.from(await transpileHtml(mainRequest.response.body.toString()))
  );

  const transpiledScriptRequests = new Set<ArchivedRequest>();
  const scriptUrls = _.uniq(
    scripts.flatMap((script): string[] =>
      script.type === "external"
        ? [
            script.url,
            ...(script.isModule ? Object.values(script.importUrlMap) : []),
          ]
        : []
    )
  );
  for (const scriptUrl of scriptUrls) {
    const scriptRequest = wprArchive.tryGetRequest(scriptUrl);
    if (!scriptRequest) continue;

    if (transpiledScriptRequests.has(scriptRequest)) continue;
    transpiledScriptRequests.add(scriptRequest);

    newWprArchive = newWprArchive.editResponseBody(
      scriptRequest,
      Buffer.from(
        await transpileExternalScript(scriptUrl, () =>
          scriptRequest.response.body.toString()
        )
      )
    );
  }

  return newWprArchive;
};
