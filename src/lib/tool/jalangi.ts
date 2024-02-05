import { spawn } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Transformer } from "../AnalysisProxy";
import { jalangiPath } from "../env";

export const transformWithJalangi: Transformer = async (
  content,
  contentType
) => {
  switch (contentType) {
    case "html":
      return await esnstrument(content, "html");
    case "javascript":
      return await esnstrument(content, "js");
  }
};

export const esnstrument = async (
  code: string,
  extension: "html" | "js"
): Promise<string> => {
  const jalDir = mkdtempSync(join(tmpdir(), "jal"));
  const originalPath = join(jalDir, `index.${extension}`);
  const instrumentedPath = join(jalDir, `index-jal.${extension}`);

  try {
    writeFileSync(originalPath, code);

    const proc = spawn(
      "node",
      [
        join(jalangiPath, "src", "js", "commands", "esnstrument_cli.js"),
        "--inlineIID",
        "--inlineSource",
        "--noResultsGUI",
        "--outDir",
        jalDir,
        "--out",
        instrumentedPath,
        originalPath,
      ],
      {
        env: {},
        stdio: "ignore",
      }
    );

    await new Promise((resolve, reject) => {
      proc.on("exit", function (code, signal) {
        resolve({ code: code, signal: signal });
      });

      proc.on("error", function (err) {
        reject(err);
      });
    });

    const instrumented = readFileSync(instrumentedPath, {
      encoding: "utf8",
    });

    return instrumented;
  } finally {
    rmSync(jalDir, { force: true, recursive: true });
  }
};
