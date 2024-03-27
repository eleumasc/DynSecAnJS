import { composeHtmlTransformers, transformHtml } from "../html/transformHtml";
import {
  createJavascriptDataUrl as createJavaScriptDataUrl,
  injectScripts,
} from "../html/injectScripts";

import { BodyTransformer } from "../lib/ExecutionHooks";
import { aranLinvailPath } from "../core/env";
import path from "path";
import { readFileSync } from "fs";
import { spawnStdio } from "../core/spawnStdio";
import { transformInlineScripts } from "../html/transformInlineScripts";

export const transformWithLinvail =
  (setupCode: string): BodyTransformer =>
  async (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return await transformHtml(
          content,
          composeHtmlTransformers([
            transformInlineScripts(async (code, isEventHandler) => {
              if (isEventHandler) {
                return code;
              }
              return await aranLinvail(code);
            }),
            injectScripts([createJavaScriptDataUrl(setupCode)]),
          ])
        );
      case "javascript":
        return await aranLinvail(content);
    }
  };

export const aranLinvail = async (code: string): Promise<string> => {
  const result = await spawnStdio(
    "node",
    [path.join(aranLinvailPath, "lib", "instrument.js")],
    code
  );
  return `(function () {\n${result}\n})();`;
};

export const getSetupCodeForLinvail = (): string => {
  return readFileSync(
    path.join(aranLinvailPath, "generated", "bundle.js")
  ).toString();
};
