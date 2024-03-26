import { BodyTransformer } from "../lib/ExecutionHooks";
import { identifyBodyTransformer } from "./util";
import { transformAsync } from "@babel/core";
import { transformHtml } from "../html/transformHtml";
import { transformInlineScripts } from "../html/transformInlineScripts";

export const transpileWithBabel: BodyTransformer = identifyBodyTransformer(
  "Babel.js",
  async (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return await transformHtml(
          content,
          transformInlineScripts(
            async (code, isEventHandler) =>
              await transpile(code, isEventHandler)
          )
        );
      case "javascript":
        return await transpile(content);
    }
  }
);

const transpile = async (
  code: string,
  isInlineEventHandler: boolean = false
): Promise<string> => {
  const result = await transformAsync(code, {
    presets: [["@babel/preset-env", { modules: false }]],
    sourceType: "unambiguous",
    parserOpts: {
      allowReturnOutsideFunction: isInlineEventHandler,
    },
  });
  return result?.code!;
};
