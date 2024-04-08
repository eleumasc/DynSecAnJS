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
    new Promise<void>((resolve, reject) => {
      childProcess.on("close", (code) => {
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
};
