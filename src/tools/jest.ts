import { BodyTransformer } from "../lib/BodyTransformer";
import { ignoreJSON } from "./ignoreJSON";
import { jestPath } from "../core/env";
import path from "path";
import { spawnStdio } from "./spawnStdio";

export const transformWithJEST =
  (): BodyTransformer =>
  (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return jest(content, "html");
      case "javascript":
        return jest(content, "js");
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
