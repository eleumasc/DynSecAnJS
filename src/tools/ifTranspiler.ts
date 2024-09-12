import path from "path";
import { addInitScript } from "../collection/htmlmanip/addInitScript";
import { composeHTMLManipulators } from "../collection/htmlmanip/HTMLManipulator";
import { execTool } from "./execTool";
import { ifTranspilerPath } from "../env";
import { inlineExternalScripts } from "../collection/htmlmanip/inlineExternalScripts";
import { manipulateHTML } from "../collection/htmlmanip/manipulateHTML";
import { readFileSync } from "fs";
import { transformInlineScripts } from "../collection/htmlmanip/transformInlineScripts";
import {
  transformWPRArchive,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";

export const transformWithIFTranspiler = (): WPRArchiveTransformer => {
  const preamble = readFileSync(
    path.join(ifTranspilerPath, "app", "preamble.js")
  ).toString();

  return transformWPRArchive(
    (body, _, originalWPRArchive, preanalyzeReport) =>
      manipulateHTML(
        body,
        composeHTMLManipulators(
          inlineExternalScripts(originalWPRArchive, preanalyzeReport, true),
          transformInlineScripts((body) => ifTranspiler(body)),
          addInitScript(preamble)
        )
      ),
    (body) => Promise.resolve(body)
  );
};

export const ifTranspiler = (source: string): Promise<string> =>
  execTool(source, "js", (originalPath, modifiedPath) => [
    "node",
    path.join(ifTranspilerPath, "app", "instrument.js"),
    originalPath,
    modifiedPath,
  ]);
