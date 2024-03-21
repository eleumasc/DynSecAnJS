import { join } from "path";
import { jestPath } from "../env";
import { ResponseTransformer } from "../ResponseTransformer";
import { identifyResponseTransformer } from "./util";
import { transformHtml } from "../html-manipulation/transformHtml";
import { inlineExternalScripts } from "../html-manipulation/inlineExternalScripts";
import { spawnStdio } from "../util/spawnStdio";

export const transformWithJEST: ResponseTransformer =
  identifyResponseTransformer("JEST", async (content, { contentType, req }) => {
    switch (contentType) {
      case "html": {
        return await jest(
          await transformHtml(content, inlineExternalScripts(req.url)),
          "html"
        );
      }
      case "javascript":
        return content;
    }
  });

export const jest = async (
  code: string,
  extension: "html" | "js"
): Promise<string> => {
  return await spawnStdio(
    join(jestPath, "jest"),
    ["--browser", `--${extension}`],
    code
  );
};
