import path from "path";
import { composeHTMLManipulators } from "../collection/htmlmanip/HTMLManipulator";
import { execLanguageBasedTool } from "./execLanguageBasedTool";
import { inlineExternalScripts } from "../collection/htmlmanip/inlineExternalScripts";
import { jestPath } from "../env";
import { manipulateHTML } from "../collection/htmlmanip/manipulateHTML";
import { transformInlineScripts } from "../collection/htmlmanip/transformInlineScripts";
import {
  transformWPRArchive,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";

export const transformWithJEST = (): WPRArchiveTransformer =>
  transformWPRArchive(
    (body, _, originalWPRArchive, preanalyzeReport) =>
      manipulateHTML(
        body,
        composeHTMLManipulators(
          inlineExternalScripts(originalWPRArchive, preanalyzeReport, true),
          transformInlineScripts(() => jest(body, "html"))
        )
      ),
    (body) => jest(body, "js")
  );

export const jest = (
  source: string,
  extension: "html" | "js"
): Promise<string> => {
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
