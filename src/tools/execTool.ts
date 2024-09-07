import assert from "assert";
import path from "path";
import ToolError from "./ToolError";
import { readFileSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { useChildProcess } from "../util/ChildProcess";
import { useTempDirectory } from "../util/TempDirectory";

export const execTool = (
  source: string,
  extension: string | undefined,
  getCmdParams: (
    originalPath: string,
    modifiedPath: string,
    cwd: string
  ) => string[]
): Promise<string> =>
  useTempDirectory(async (tempPath) => {
    extension = extension ?? "txt";
    const originalPath = path.join(tempPath, `original.${extension}`);
    const modifiedPath = path.join(tempPath, `modified.${extension}`);

    writeFileSync(originalPath, source);

    const cmdParams = getCmdParams(originalPath, modifiedPath, tempPath);
    assert(cmdParams.length >= 1);

    await useChildProcess(
      spawn(cmdParams[0], cmdParams.slice(1), {
        stdio: ["ignore", "ignore", "pipe"],
      }),
      (childProcess) => {
        let stderr = "";
        childProcess.stderr!.on("data", (data) => {
          stderr += data.toString();
        });

        return new Promise<void>((res, rej) => {
          childProcess.on("close", (code) => {
            if (code === 0) {
              res();
            } else {
              rej(new ToolError(stderr));
            }
          });
        });
      }
    );

    return readFileSync(modifiedPath).toString();
  });
