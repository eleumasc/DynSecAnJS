import pidusage, { Status } from "pidusage";

import { promisify } from "util";
import { spawn } from "child_process";
import { useChildProcess } from "../core/process";

const MEM_LIMIT = 1024 * 1024 * 1024; // 1GB

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
      let intervalId: NodeJS.Timeout | null = null;
      await Promise.all([
        new Promise<void>((resolve) => {
          childProcess.stdout!.on("close", () => resolve());
        }),
        new Promise<void>((resolve) => {
          childProcess.stderr!.on("close", () => resolve());
        }),
        Promise.race([
          new Promise<void>((resolve, reject) => {
            childProcess.on("exit", (code) => {
              errorState = code !== 0;
              resolve();
            });
            childProcess.on("error", (err) => {
              reject(err);
            });
          }),
          new Promise((_, reject) => {
            intervalId = setInterval(async () => {
              try {
                const { memory } = await promisify<Status>((callback) =>
                  pidusage(childProcess.pid!, callback)
                )();
                if (memory > MEM_LIMIT) {
                  reject(new Error("Memory exceeded"));
                }
              } catch (e) {
                reject(e);
              }
            }, 500);
          }),
        ]).finally(() => {
          if (intervalId !== null) {
            clearInterval(intervalId);
          }
        }),
      ]);

      if (errorState) {
        throw new Error(stderrData);
      }

      return stdoutData;
    }
  );
