import { mkdtemp, readFile, rm, writeFile } from "fs/promises";

import { BodyTransformer } from "../lib/BodyTransformer";
import { existsSync } from "fs";
import { ignoreJSON } from "./ignoreJSON";
import { jalangiPath } from "../core/env";
import path from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { useChildProcess } from "../core/process";

export const transformWithJalangi =
  (analysisPath: string): BodyTransformer =>
  async (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return await jalangi(analysisPath, content, "html");
      case "javascript":
        return await jalangi(analysisPath, content, "js");
    }
  };

export const jalangi = (
  analysisPath: string,
  code: string,
  extension: "html" | "js"
): Promise<string> =>
  ignoreJSON(code, async (code) => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), "jal"));
    const originalPath = path.join(tmpDir, `index.${extension}`);
    const modifiedPath = path.join(tmpDir, `index-mod.${extension}`);

    try {
      await writeFile(originalPath, code);

      await useChildProcess(
        {
          childProcess: spawn("node", [
            path.join(
              jalangiPath,
              "src",
              "js",
              "commands",
              "esnstrument_cli.js"
            ),
            "--analysis",
            path.resolve(analysisPath),
            "--inlineIID",
            "--inlineSource",
            "--noResultsGUI",
            "--outDir",
            tmpDir,
            "--out",
            modifiedPath,
            originalPath,
          ]),

          terminate: async (childProcess) => {
            childProcess.kill("SIGINT");
          },
        },

        async (childProcess) => {
          let stderrData = "";
          childProcess.stderr?.on("data", (data) => {
            stderrData += data.toString();
          });

          await Promise.all([
            new Promise<void>((resolve) => {
              childProcess.stderr!.on("close", () => resolve());
            }),
            new Promise<void>((resolve, reject) => {
              childProcess.on("exit", () => {
                resolve();
              });
              childProcess.on("error", (err) => {
                reject(err);
              });
            }),
          ]);

          if (!existsSync(modifiedPath)) {
            throw new Error(stderrData);
          }
        }
      );

      return (await readFile(modifiedPath)).toString();
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });
