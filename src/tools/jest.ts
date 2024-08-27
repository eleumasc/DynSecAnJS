import { ignoreJSON } from "./ignoreJSON";
import { jestPath } from "../env";
import path from "path";
import { spawnStdio } from "./spawnStdio";

export const transformWithJEST = () => {
  throw new Error("Not implemented");

  // return async (content, { contentType }) => {
  //   switch (contentType) {
  //     case "html":
  //       return await jest(content, "html");
  //     case "javascript":
  //       return content;
  //   }
  // };
};

export const jest = (code: string, extension: "html" | "js"): Promise<string> =>
  ignoreJSON(code, async (code) => {
    return await spawnStdio(
      path.join(jestPath, "jest"),
      ["--browser", `--${extension}`],
      code
    );
  });
