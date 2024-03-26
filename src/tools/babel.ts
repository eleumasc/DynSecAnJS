import { BodyTransformer } from "../lib/ExecutionHooks";
import { transformAsync } from "@babel/core";
import { transformHtml } from "../html/transformHtml";
import { transformInlineScripts } from "../html/transformInlineScripts";

export const transpileWithBabel =
  (): BodyTransformer =>
  async (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return await transformHtml(
          content,
          transformInlineScripts(
            async (code, isEventHandler) => await babel(code, isEventHandler)
          )
        );
      case "javascript":
        return await babel(content);
    }
  };

const babel = async (
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
