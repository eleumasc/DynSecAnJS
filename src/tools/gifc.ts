import { composeHtmlTransformers, transformHtml } from "../html/transformHtml";
import {
  createJavascriptDataUrl as createJavaScriptDataUrl,
  injectScripts,
} from "../html/injectScripts";

import { BodyTransformer } from "../lib/BodyTransformer";
import { gifcPath } from "../core/env";
import { ignoreJSON } from "./ignoreJSON";
import path from "path";
import { readFileSync } from "fs";
import { spawnStdio } from "./spawnStdio";
import { transformInlineScripts } from "../html/transformInlineScripts";

export const transformWithGIFC = (): BodyTransformer => {
  const setupCode = readFileSync(
    path.join(gifcPath, "build", "setup.js")
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
              return await gifc(code);
            }),
            injectScripts([createJavaScriptDataUrl(setupCode)]),
          ])
        );
      case "javascript":
        return await gifc(content);
    }
  };
};

export const gifc = (code: string): Promise<string> =>
  ignoreJSON(code, async (code) => {
    const result = await spawnStdio(
      "node",
      [path.join(gifcPath, "transform.js")],
      code
    );
    return `{\n${result}\n}`;
  });
