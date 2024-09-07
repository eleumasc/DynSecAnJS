import path from "path";
import { composeHTMLManipulators } from "../collection/htmlmanip/HTMLManipulator";
import { execTool } from "./execTool";
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
          transformInlineScripts((body) => jest(body, "js"))
        )
      ),
    (body) => Promise.resolve(body)
  );

export const jest = (
  source: string,
  extension: "html" | "js"
): Promise<string> =>
  execTool(source, extension, (originalPath, modifiedPath) => [
    path.join(jestPath, "jest"),
    "--browser",
    `--${extension}`,
    `--input=${originalPath}`,
    `--output=${modifiedPath}`,
  ]);
