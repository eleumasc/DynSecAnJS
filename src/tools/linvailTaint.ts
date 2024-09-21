import path from "path";
import { addInitScript } from "../collection/htmlmanip/addInitScript";
import { composeHTMLManipulators } from "../collection/htmlmanip/HTMLManipulator";
import { execTool } from "./execTool";
import { linvailTaintPath } from "../env";
import { manipulateHTML } from "../collection/htmlmanip/manipulateHTML";
import { readFileSync } from "fs";
import { transformInlineScripts } from "../collection/htmlmanip/transformInlineScripts";
import {
  transformWPRArchive,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";

export const transformWithLinvailTaint = (): WPRArchiveTransformer => {
  const setup = readFileSync(
    path.join(linvailTaintPath, "generated", "setup.js")
  ).toString();

  const instrumentedPolicy = readFileSync(
    path.join(linvailTaintPath, "generated", "policy.instrumented.js")
  ).toString();

  const preamble = `${setup}\n${instrumentedPolicy}`;

  return transformWPRArchive(
    (body, { wrapScriptTransform }) =>
      manipulateHTML(
        body,
        composeHTMLManipulators(
          transformInlineScripts(
            wrapScriptTransform((body) => linvailTaint(body))
          ),
          addInitScript(preamble)
        )
      ),
    (body, { wrapScriptTransform }) =>
      wrapScriptTransform((body) => linvailTaint(body))(body)
  );
};

export const linvailTaint = (source: string): Promise<string> =>
  execTool(source, "js", (originalPath, modifiedPath) => [
    "node",
    path.join(linvailTaintPath, "app", "instrument.js"),
    originalPath,
    modifiedPath,
  ]);
