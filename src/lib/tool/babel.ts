import { transformAsync } from "@babel/core";
import { ResponseTransformer } from "../ResponseTransformer";
import { transformInlineScripts } from "../html-manipulation/transformInlineScripts";
import { identifyResponseTransformer } from "./util";
import { transformHtml } from "../html-manipulation/transformHtml";

export const transpileWithBabel: ResponseTransformer = identifyResponseTransformer(
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
    presets: ["@babel/preset-env"],
    sourceType: "script",
    parserOpts: {
      allowReturnOutsideFunction: isInlineEventHandler,
    },
  });
  return result?.code!;
};
