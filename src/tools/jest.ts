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
    (body, { oldWPRArchive, syntax, wrapScriptTransform }) =>
      manipulateHTML(
        body,
        composeHTMLManipulators(
          inlineExternalScripts(oldWPRArchive, syntax, true),
          transformInlineScripts(
            wrapScriptTransform((body) => jest(body, "js"), syntax.scripts)
          )
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
