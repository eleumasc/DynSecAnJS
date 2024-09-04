import path from "path";
import { Completion } from "../util/Completion";
import { execLanguageBasedTool } from "./execLanguageBasedTool";
import { inlineExternalScripts } from "../collection/inlineExternalScripts";
import { jestPath } from "../env";
import {
  composeWPRArchiveTransformers,
  transformWPRArchive,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";

export const transformWithJEST = (): WPRArchiveTransformer =>
  composeWPRArchiveTransformers(
    inlineExternalScripts(true),
    transformWPRArchive(
      (body) => jest(body, "html"),
      (body) => jest(body, "js")
    )
  );

export const jest = (
  source: string,
  extension: "html" | "js"
): Promise<Completion<string>> => {
  return execLanguageBasedTool(
    source,
    extension,
    (originalPath, modifiedPath) => [
      path.join(jestPath, "jest"),
      "--browser",
      `--${extension}`,
      `--input=${originalPath}`,
      `--output=${modifiedPath}`,
    ]
  );
};
