import { spawn } from "child_process";
import { useChildProcess } from "../core/process";

export const spawnStdio = (
  command: string,
  args: readonly string[] | undefined,
  stdinData: string
): Promise<string> =>
  useChildProcess(
    {
      childProcess: spawn(command, args),

      terminate: async (childProcess) => {
        childProcess.kill("SIGINT");
      },
    },

    async (childProcess) => {
      let stdoutData = "";
      childProcess.stdout?.on("data", (data) => {
        stdoutData += data.toString();
      });

      let stderrData = "";
      childProcess.stderr?.on("data", (data) => {
        stderrData += data.toString();
      });

      await new Promise<void>((resolve, reject) => {
        const stdin = childProcess.stdin!;

        stdin.on("error", (err) => {
          reject(err);
        });

        stdin.write(stdinData);
        stdin.end();
        resolve();
      });

      let errorState = false;
      await Promise.all([
        new Promise<void>((resolve) => {
          childProcess.stdout!.on("close", () => resolve());
        }),
        new Promise<void>((resolve) => {
          childProcess.stderr!.on("close", () => resolve());
        }),
        new Promise<void>((resolve, reject) => {
          childProcess.on("exit", (code) => {
            errorState = code !== 0;
            resolve();
          });
          childProcess.on("error", (err) => {
            reject(err);
          });
        }),
      ]);

      if (errorState) {
        throw new Error(stderrData);
      }

      return stdoutData;
    }
  );
