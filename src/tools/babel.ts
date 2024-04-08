import { BodyTransformer } from "../lib/BodyTransformer";
import { ignoreJSON } from "./ignoreJSON";
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

const babel = (
  code: string,
  isInlineEventHandler: boolean = false
): Promise<string> =>
  ignoreJSON(code, async (code) => {
    const result = await transformAsync(code, {
      presets: ["@babel/preset-env"],
      sourceType: "script",
      parserOpts: {
        allowReturnOutsideFunction: isInlineEventHandler,
      },
    });
    return result?.code!;
  });
