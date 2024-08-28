import { AttributeHtmlScript, ElementHtmlScript } from "../htmlutil/HTMLScript";
import { BrowserPackEntry, bundleModule } from "./bundleModule";

import DataURL from "../util/DataURL";
import HtmlDocument from "../htmlutil/HTMLDocument";
import { Syntax } from "../syntax/Syntax";
import WPRArchive from "../wprarchive/WPRArchive";
import assert from "assert";
import { isJavaScriptMimeType } from "../util/mimeType";
import { md5 } from "../util/hash";
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

    const createModuleBundle = async (): Promise<string> => {
      const moduleBundleEntries = scripts.flatMap(
        (script): BrowserPackEntry[] => {
          if (!script.isModule) return [];

          if (script.type === "external") {
            let req;
            try {
              req = wprArchive.getRequest(script.url);
            } catch {
              return [];
            }
            return [
              {
                id: script.url,
                source: req.response.body.toString(),
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
        }
      );
      assert(moduleBundleEntries.length > 0);
      return await transpileJavascript(await bundleModule(moduleBundleEntries));
    };

    let moduleBundleIncluded = false;
    const loadModule = async (
      htmlScript: ElementHtmlScript,
      moduleName: string
    ): Promise<void> => {
      htmlScript.inlineSource =
        (!moduleBundleIncluded ? `${await createModuleBundle()}\n\n` : "") +
        `window["\$__require"](${JSON.stringify(moduleName)});`;
      moduleBundleIncluded = true;
    };

    for (const htmlScript of htmlScripts) {
      if (htmlScript instanceof ElementHtmlScript) {
        if (htmlScript.isExternal) {
          const scriptUrl = scriptUrlMap[htmlScript.src];
          assert(scriptUrl !== undefined);

          const script = scripts.find(
            (script) => script.type === "external" && script.url === scriptUrl
          );
          assert(script);
          assert(script.isModule === htmlScript.isModule);

          if (script.isModule) {
            await loadModule(htmlScript, scriptUrl);
          }
        } else {
          const { inlineSource: source } = htmlScript;
          const scriptHash = md5(source);

          const script = scripts.find(
            (script) => script.type === "inline" && script.hash === scriptHash
          );
          assert(script);

          if (script.isModule) {
            await loadModule(htmlScript, scriptHash);
          } else {
            htmlScript.inlineSource = await transpileJavascript(source);
          }
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

    return htmlDocument.serialize();
  };

  let newWprArchive = wprArchive;

  const mainRequest = wprArchive.getRequest(mainUrl);
  newWprArchive = newWprArchive.alterResponse(
    mainRequest,
    mainRequest.response.withBody(
      Buffer.from(await transpileHtml(mainRequest.response.body.toString()))
    )
  );

  for (const script of scripts) {
    if (script.type !== "external" || script.isModule) continue;

    let request;
    try {
      request = wprArchive.getRequest(script.url);
    } catch {
      continue;
    }
    newWprArchive = newWprArchive.alterResponse(
      request,
      request.response.withBody(
        Buffer.from(await transpileJavascript(request.response.body.toString()))
      )
    );
  }

  return newWprArchive;
};
