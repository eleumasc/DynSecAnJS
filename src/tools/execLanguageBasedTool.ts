import assert from "assert";
import path from "path";
import {
  Completion,
  Failure,
  isSuccess,
  Success
  } from "../util/Completion";
import { readFileSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { useChildProcess } from "../util/ChildProcess";
import { useTempDirectory } from "../util/TempDirectory";

export const execLanguageBasedTool = (
  source: string,
  extension: string | undefined,
  getCmdParams: (
    originalPath: string,
    modifiedPath: string,
    cwd: string
  ) => string[]
): Promise<Completion<string>> =>
  useTempDirectory(async (tempPath) => {
    extension = extension ?? "txt";
    const originalPath = path.join(tempPath, `original.${extension}`);
    const modifiedPath = path.join(tempPath, `modified.${extension}`);

    writeFileSync(originalPath, source);

    const cmdParams = getCmdParams(originalPath, modifiedPath, tempPath);
    assert(cmdParams.length >= 1);

    const completion = await useChildProcess(
      spawn(cmdParams[0], cmdParams.slice(1), {
        stdio: ["ignore", "ignore", "pipe"],
      }),
      (childProcess) => {
        let stderr = "";
        childProcess.stderr!.on("data", (data) => {
          stderr += data.toString();
        });

        return new Promise<Completion<void>>((resolve) => {
          childProcess.on("close", (code) => {
            if (code === 0) {
              resolve(Success(undefined));
            } else {
              resolve(Failure(stderr));
            }
          });
        });
      }
    );

    if (!isSuccess(completion)) {
      return completion;
    }

    return Success(readFileSync(modifiedPath).toString());
  });
