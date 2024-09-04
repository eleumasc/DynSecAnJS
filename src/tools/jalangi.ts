import path from "path";
import { Completion } from "../util/Completion";
import { execLanguageBasedTool } from "./execLanguageBasedTool";
import { jalangiPath } from "../env";
import {
  transformWPRArchive,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";

export const transformWithJalangi = (
  analysisPath: string
): WPRArchiveTransformer =>
  transformWPRArchive(
    (body) => jalangi(analysisPath, body, "html"),
    (body) => jalangi(analysisPath, body, "js")
  );

export const jalangi = (
  analysisPath: string,
  source: string,
  extension: "html" | "js"
): Promise<Completion<string>> =>
  execLanguageBasedTool(
    source,
    extension,
    (originalPath, modifiedPath, cwd) => [
      "node",
      path.join(jalangiPath, "src", "js", "commands", "esnstrument_cli.js"),
      "--analysis",
      path.resolve(analysisPath),
      "--inlineIID",
      "--inlineSource",
      "--noResultsGUI",
      "--outDir",
      cwd,
      "--out",
      modifiedPath,
      originalPath,
    ]
  );
