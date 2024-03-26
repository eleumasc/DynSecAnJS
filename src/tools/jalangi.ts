import { mkdtemp, readFile, rm, writeFile } from "fs/promises";

import { BodyTransformer } from "../lib/ExecutionHooks";
import { existsSync } from "fs";
import { identifyBodyTransformer } from "./util";
import { jalangiPath } from "../core/env";
import { join } from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";

export const transformWithJalangi: BodyTransformer = identifyBodyTransformer(
  "Jalangi",
  async (content, { contentType }) => {
    switch (contentType) {
      case "html":
        return await esnstrument(content, "html");
      case "javascript":
        return await esnstrument(content, "js");
    }
  }
);

export const esnstrument = async (
  code: string,
  extension: "html" | "js"
): Promise<string> => {
  const tmpDir = await mkdtemp(join(tmpdir(), "jal"));
  const originalPath = join(tmpDir, `index.${extension}`);
  const modifiedPath = join(tmpDir, `index-mod.${extension}`);

  try {
    await writeFile(originalPath, code);

    const childProcess = spawn(
      "node",
      [
        join(jalangiPath, "src", "js", "commands", "esnstrument_cli.js"),
        "--inlineIID",
        "--inlineSource",
        "--noResultsGUI",
        "--outDir",
        tmpDir,
        "--out",
        modifiedPath,
        originalPath,
      ],
      {
        env: {},
        stdio: "ignore",
      }
    );

    let logData = "";
    childProcess.stdout?.on("data", (data) => {
      logData += data.toString();
    });

    await new Promise<void>((resolve, reject) => {
      childProcess.on("exit", () => {
        resolve();
      });
      childProcess.on("error", (err) => {
        reject(err);
      });
    });

    if (!existsSync(modifiedPath)) {
      throw new Error(logData);
    }

    return (await readFile(modifiedPath)).toString();
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
};
