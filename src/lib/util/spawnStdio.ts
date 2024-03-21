import { spawn } from "child_process";

export const spawnStdio = async (
  command: string,
  args: readonly string[] | undefined,
  stdinData: string
): Promise<string> => {
  const childProcess = spawn(command, args);

  let stdoutData = "";
  childProcess.stdout?.on("data", (data) => {
    stdoutData += data.toString();
  });

  let stderrData = "";
  childProcess.stderr?.on("data", (data) => {
    stderrData += data.toString();
  });

  const stdin = childProcess.stdin!;
  stdin.write(stdinData);
  stdin.end();

  await Promise.all([
    new Promise<void>((resolve) => {
      childProcess.stdout?.on("end", () => resolve());
    }),
    new Promise<void>((resolve) => {
      childProcess.stderr?.on("end", () => resolve());
    }),
    new Promise<void>((resolve, reject) => {
      childProcess.on("exit", function (code) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderrData));
        }
      });
      childProcess.on("error", function (err) {
        reject(err);
      });
    }),
  ]);

  return stdoutData;
};
