import path from "path";
import { Completion, isSuccess, Success } from "../util/Completion";
import { execLanguageBasedTool } from "./execLanguageBasedTool";
import { gifcPath } from "../env";
import { readFileSync } from "fs";
import { WPRArchiveTransformer } from "../collection/WPRArchiveTransformer";

export const transformWithGIFC = (): WPRArchiveTransformer => {
  throw new Error("Not implemented");

  const setupCode = readFileSync(
    path.join(gifcPath, "build", "setup.js")
  ).toString();

  // return async (content, { contentType }) => {
  //   switch (contentType) {
  //     case "html":
  //       return await transformHtml(
  //         content,
  //         composeHtmlTransformers([
  //           transformInlineScripts(async (code, isEventHandler) => {
  //             if (isEventHandler) {
  //               return code;
  //             }
  //             return await gifc(code);
  //           }),
  //           injectScripts([createJavaScriptDataUrl(setupCode)]),
  //         ])
  //       );
  //     case "javascript":
  //       return await gifc(content);
  //   }
  // };
};

// export const gifc = async (source: string): Promise<Completion<string>> => {
//   const completion = await execLanguageBasedTool(source, undefined, () => [
//     "node",
//     path.join(gifcPath, "transform.js"),
//   ]);

//   return isSuccess(completion)
//     ? Success(`{\n${completion.value}\n}`)
//     : completion;
// };
