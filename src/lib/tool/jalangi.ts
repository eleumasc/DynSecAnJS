import assert from "assert";
import childProcess from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import "dotenv/config";

export const esnstrument = async (
  code: string,
  extension: "html" | "js"
): Promise<string> => {
  const jalangiPath = process.env.JALANGI_PATH as string | undefined;
  assert(typeof jalangiPath !== "undefined");

  const outDir = mkdtempSync(path.join(os.tmpdir(), "jal-"));
  const originalFile = `index.${extension}`;
  const instrumentedFile = `index-jal.${extension}`;

  writeFileSync(path.join(outDir, originalFile), code);

  const proc = childProcess.spawn(
    "node",
    [
      path.join(jalangiPath, "src", "js", "commands", "esnstrument_cli.js"),
      "--inlineIID",
      "--inlineSource",
      "--noResultsGUI",
      "--outDir",
      outDir,
      "--out",
      path.join(outDir, instrumentedFile),
      path.join(outDir, originalFile),
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

  const instrumented = readFileSync(path.join(outDir, instrumentedFile), {
    encoding: "utf8",
  });

  rmSync(outDir, { force: true, recursive: true });

  return instrumented;
};
