import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { jalangiPath } from "../env";
import { Transformer } from "../PuppeteerAgent";
import { identifyTransformer } from "./identifyTransformer";

export const transformWithJalangi: Transformer = identifyTransformer(
  "Jalangi",
  async (content, contentType) => {
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
  let stdoutData = "";

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

    childProcess.stdout?.on("data", (data) => {
      stdoutData += data.toString();
    });

    await new Promise((resolve, reject) => {
      childProcess.on("exit", function (code, signal) {
        resolve({ code: code, signal: signal });
      });

      childProcess.on("error", function (err) {
        reject(err);
      });
    });

    const modified = (await readFile(modifiedPath)).toString();

    return modified;
  } catch (e) {
    throw new Error(`${String(e)}\n\n${stdoutData}`);
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
};
