import { mkdtemp, readFile, rm, writeFile } from "fs/promises";

import { BodyTransformer } from "../lib/BodyTransformer";
import { existsSync } from "fs";
import { jalangiPath } from "../core/env";
import path from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";

export const transformWithJalangi =
  (): BodyTransformer =>
  async (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return await jalangi(content, "html");
      case "javascript":
        return await jalangi(content, "js");
    }
  };

export const jalangi = async (
  code: string,
  extension: "html" | "js"
): Promise<string> => {
  const tmpDir = await mkdtemp(path.join(tmpdir(), "jal"));
  const originalPath = path.join(tmpDir, `index.${extension}`);
  const modifiedPath = path.join(tmpDir, `index-mod.${extension}`);

  try {
    await writeFile(originalPath, code);

    const childProcess = spawn("node", [
      path.join(jalangiPath, "src", "js", "commands", "esnstrument_cli.js"),
      "--inlineIID",
      "--inlineSource",
      "--noResultsGUI",
      "--outDir",
      tmpDir,
      "--out",
      modifiedPath,
      originalPath,
    ]);

    let stderrData = "";
    childProcess.stderr?.on("data", (data) => {
      stderrData += data.toString();
    });

    await Promise.all([
      new Promise<void>((resolve) => {
        childProcess.stdout?.on("end", () => resolve());
      }),
      new Promise<void>((resolve) => {
        childProcess.stderr?.on("end", () => resolve());
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

    return (await readFile(modifiedPath)).toString();
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
};
