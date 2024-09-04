import { ChildProcess } from "child_process";
import { killOnSignal } from "./gracefulTermination";

export const useChildProcess = async <T>(
  childProcess: ChildProcess,
  use: (childProcess: ChildProcess) => Promise<T>
): Promise<T> => {
  const killer = killOnSignal(childProcess);

  let alive = false;

  childProcess.on("exit", () => {
    alive = false;
  });

  try {
    await new Promise((res, rej) => {
      childProcess.on("spawn", res);

      childProcess.on("error", rej);
    });
    alive = true;

    return await use(childProcess);
  } finally {
    if (alive) {
      await new Promise((resolve) => {
        childProcess.on("exit", resolve);
      });

      childProcess.kill("SIGKILL");
    }

    killer.cancel();
  }
};
