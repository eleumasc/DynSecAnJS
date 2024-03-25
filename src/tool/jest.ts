import { BodyTransformer } from "../lib/ExecutionHooks";
import { identifyBodyTransformer } from "./util";
import { inlineExternalScripts } from "../html-manipulation/inlineExternalScripts";
import { jestPath } from "../lib/env";
import { join } from "path";
import { spawnStdio } from "../util/spawnStdio";
import { transformHtml } from "../html-manipulation/transformHtml";

export const transformWithJEST: BodyTransformer = identifyBodyTransformer(
  "JEST",
  async (content, { contentType, req }) => {
    switch (contentType) {
      case "html":
        return await jest(
          await transformHtml(content, inlineExternalScripts(req.url)),
          "html"
        );
      case "javascript":
        return content;
    }
  }
);

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
