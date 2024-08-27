import { gifcPath } from "../env";
import { ignoreJSON } from "./ignoreJSON";
import path from "path";
import { spawnStdio } from "./spawnStdio";

export const transformWithGIFC = () => {
  throw new Error("Not implemented");

  // const setupCode = readFileSync(
  //   path.join(gifcPath, "build", "setup.js")
  // ).toString();

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

export const gifc = (code: string): Promise<string> =>
  ignoreJSON(code, async (code) => {
    const result = await spawnStdio(
      "node",
      [path.join(gifcPath, "transform.js")],
      code
    );
    return `{\n${result}\n}`;
  });
