import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { jalangiPath } from "../env";
import { ResponseTransformer } from "../ResponseTransformer";
import { identifyResponseTransformer } from "./util";

export const transformWithJalangi: ResponseTransformer = identifyResponseTransformer(
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

  let logData = "";
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

    return (await readFile(modifiedPath)).toString();
  } catch (e) {
    throw new Error(`${String(e)}\n\n${logData}`);
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
};
