import assert from "assert";
import DataURL from "../util/DataURL";
import HtmlDocument from "../htmlutil/HTMLDocument";
import WPRArchive from "../wprarchive/WPRArchive";
import { AttributeHtmlScript, ElementHtmlScript } from "../htmlutil/HTMLScript";
import { BrowserPackEntry, bundleModule } from "./bundleModule";
import { isJavaScriptMimeType } from "../util/mimeType";
import { md5 } from "../util/hash";
import { Syntax } from "../syntax/Syntax";
import { transformSync } from "@babel/core";

export const transpile = async (
  wprArchive: WPRArchive,
  syntax: Syntax
): Promise<WPRArchive> => {
  // TODO: add optional user-defined transformation
  // TODO: add optional external script inlining (e.g., for supporting JEST)
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

  const generateModuleLoadingSource = (moduleName: string) =>
    `window["\$__require"](${JSON.stringify(moduleName)});`;

  const transpileHtml = async (htmlSource: string): Promise<string> => {
    const htmlDocument = HtmlDocument.parse(htmlSource);
    const htmlScripts = htmlDocument.scriptList.filter(
      (script) => !(script instanceof ElementHtmlScript && script.isNoModule)
    );

    for (const htmlScript of htmlScripts) {
      if (htmlScript instanceof ElementHtmlScript) {
        htmlScript.integrity = undefined;
        htmlScript.isAsync = false;

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

    for (const htmlScript of htmlScripts) {
      if (htmlScript instanceof ElementHtmlScript) {
        if (htmlScript.isInline) {
          const { inlineSource: source } = htmlScript;
          const scriptHash = md5(source);

          const script = scripts.find(
            (script) => script.type === "inline" && script.hash === scriptHash
          );
          assert(script);

          htmlScript.inlineSource = script.isModule
            ? generateModuleLoadingSource(scriptHash)
            : await transpileJavascript(source);
        }
      } else if (htmlScript instanceof AttributeHtmlScript) {
        const { inlineSource: source } = htmlScript;

        htmlScript.inlineSource = await transpileJavascript(source, true);
      } else {
        throw new Error("Unknown type of HtmlScript"); // This should never happen
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
    if (mbEntries.length > 0) {
      const mbHtmlScript = htmlDocument.createInitHtmlScript();
      mbHtmlScript.isModule = true;
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

  for (const script of scripts) {
    if (script.type !== "external") continue;

    const scriptRequest = wprArchive.tryGetRequest(script.url);
    if (!scriptRequest) continue;

    newWprArchive = newWprArchive.editResponseBody(
      scriptRequest,
      Buffer.from(
        script.isModule
          ? generateModuleLoadingSource(script.url)
          : await transpileJavascript(scriptRequest.response.body.toString())
      )
    );
  }

  return newWprArchive;
};
