import { BodyTransformer } from "../lib/BodyTransformer";
import { ignoreJSON } from "./ignoreJSON";
import { inlineExternalScripts } from "../html/inlineExternalScripts";
import { jestPath } from "../core/env";
import path from "path";
import { spawnStdio } from "./spawnStdio";
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

export const jest = (code: string, extension: "html" | "js"): Promise<string> =>
  ignoreJSON(code, async (code) => {
    return await spawnStdio(
      path.join(jestPath, "jest"),
      ["--browser", `--${extension}`],
      code
    );
  });
