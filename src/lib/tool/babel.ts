import { transformAsync } from "@babel/core";
import { Transformer } from "../PuppeteerAgent";
import { transformInlineScripts } from "../compatibility/transformInlineScripts";
import { identifyTransformer } from "./identifyTransformer";

export const transpileWithBabel: Transformer = identifyTransformer(
  "Babel.js",
  async (content, contentType) => {
    switch (contentType) {
      case "html":
        return await transformInlineScripts(
          content,
          async (code, isEventHandler) => await transpile(code, isEventHandler)
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
