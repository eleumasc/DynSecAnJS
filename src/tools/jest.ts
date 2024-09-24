import path from "path";
import { composeHTMLManipulators } from "../collection/htmlmanip/HTMLManipulator";
import { execTool } from "./execTool";
import { inlineExternalScripts } from "../collection/htmlmanip/inlineExternalScripts";
import { interceptInlineScripts } from "../collection/htmlmanip/interceptInlineScripts";
import { jestPath } from "../env";
import { manipulateHTML } from "../collection/htmlmanip/manipulateHTML";
import { transformInlineScripts } from "../collection/htmlmanip/transformInlineScripts";
import {
  transformWPRArchive,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";

export const transformWithJEST = (): WPRArchiveTransformer =>
  transformWPRArchive(
    (
      body,
      { oldWPRArchive, syntax, checkScriptTransform, tryScriptTransform }
    ) =>
      manipulateHTML(
        body,
        composeHTMLManipulators(
          interceptInlineScripts(
            checkScriptTransform((body) => jest(body, "js"))
          ),
          inlineExternalScripts(oldWPRArchive, syntax, true),
          transformInlineScripts(tryScriptTransform((body) => jest(body, "js")))
        )
      ),
    (body, { checkScriptTransform }) =>
      checkScriptTransform((body) => jest(body, "js"))(body)
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
