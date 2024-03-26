import { BodyTransformer } from "../lib/ExecutionHooks";
import { inlineExternalScripts } from "../html/inlineExternalScripts";
import { jestPath } from "../core/env";
import path from "path";
import { spawnStdio } from "../core/spawnStdio";
import { transformHtml } from "../html/transformHtml";

export const transformWithJEST =
  (): BodyTransformer =>
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
  };

export const jest = async (
  code: string,
  extension: "html" | "js"
): Promise<string> => {
  return await spawnStdio(
    path.join(jestPath, "jest"),
    ["--browser", `--${extension}`],
    code
  );
};
