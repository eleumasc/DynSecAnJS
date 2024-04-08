import { composeHtmlTransformers, transformHtml } from "../html/transformHtml";
import {
  createJavascriptDataUrl as createJavaScriptDataUrl,
  injectScripts,
} from "../html/injectScripts";

import { BodyTransformer } from "../lib/BodyTransformer";
import { aranLinvailPath } from "../core/env";
import { ignoreJSON } from "./ignoreJSON";
import path from "path";
import { readFileSync } from "fs";
import { spawnStdio } from "./spawnStdio";
import { transformInlineScripts } from "../html/transformInlineScripts";

export const transformWithAranLinvail = (
  analysisName: string
): BodyTransformer => {
  const setupCode = readFileSync(
    path.join(aranLinvailPath, "build", analysisName, "bundle.js")
  ).toString();

  return async (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return await transformHtml(
          content,
          composeHtmlTransformers([
            transformInlineScripts(async (code, isEventHandler) => {
              if (isEventHandler) {
                return code;
              }
              return await aranLinvail(analysisName, code, true);
            }),
            injectScripts([createJavaScriptDataUrl(setupCode)]),
          ])
        );
      case "javascript":
        return await aranLinvail(analysisName, content, true);
    }
  };
};

export const aranLinvail = (
  analysisName: string,
  code: string,
  wrap: boolean = false
): Promise<string> =>
  ignoreJSON(code, async (code) => {
    const result = await spawnStdio(
      "node",
      [path.join(aranLinvailPath, "build", analysisName, "transform.js")],
      code
    );
    return wrap ? `(function () {\n${result}\n})();` : result;
  });
