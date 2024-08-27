import { ignoreJSON } from "./ignoreJSON";
import { transformAsync } from "@babel/core";

export const transpileWithBabel = () => {
  throw new Error("Not implemented");

  // return async (content, { contentType }) => {
  //   switch (contentType) {
  //     case "html":
  //       return await transformHtml(
  //         content,
  //         transformInlineScripts(
  //           async (code, isEventHandler) => await babel(code, isEventHandler)
  //         )
  //       );
  //     case "javascript":
  //       return await babel(content);
  //   }
  // };
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
