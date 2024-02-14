import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Transformer } from "../MonitorProxy";
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
  const tmpDir = await mkdtemp(join(tmpdir(), "jal"));
  const originalPath = join(tmpDir, `index.${extension}`);
  const modifiedPath = join(tmpDir, `index-mod.${extension}`);

  try {
    await writeFile(originalPath, code);

    const proc = spawn(
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

    await new Promise((resolve, reject) => {
      proc.on("exit", function (code, signal) {
        resolve({ code: code, signal: signal });
      });

      proc.on("error", function (err) {
        reject(err);
      });
    });

    const modified = (await readFile(modifiedPath)).toString();

    return modified;
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
};
