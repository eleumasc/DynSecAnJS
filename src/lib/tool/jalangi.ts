import "dotenv/config";
import assert from "assert";
import { spawn } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Transformer } from "../AnalysisProxy";

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
  const jalangiPath = process.env.JALANGI_PATH as string | undefined;
  assert(typeof jalangiPath !== "undefined");

  const outDir = mkdtempSync(join(tmpdir(), "jal-"));
  const originalPath = join(outDir, `index.${extension}`);
  const instrumentedPath = join(outDir, `index-jal.${extension}`);

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
        outDir,
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
    rmSync(outDir, { force: true, recursive: true });
  }
};
