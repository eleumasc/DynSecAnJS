import { addTerminator } from "./gracefulTermination";
import { ChildProcess } from "child_process";

interface UseChildProcessController {
  kill(signal?: NodeJS.Signals): Promise<void>;
}

export const useChildProcess = async <T>(
  childProcess: ChildProcess,
  use: (
    childProcess: ChildProcess,
    controller: UseChildProcessController
  ) => Promise<T>
): Promise<T> => {
  await new Promise((res, rej) => {
    childProcess.on("spawn", res);

    childProcess.on("error", rej);
  });

  let alive = true;
  const didExit = () => {
    if (alive) {
      alive = false;
      terminator.cancel();
    }
  };
  const kill = async (signal?: NodeJS.Signals): Promise<void> => {
    if (alive) {
      await new Promise<void>((resolve) => {
        childProcess.on("exit", () => {
          didExit();
          resolve();
        });

        childProcess.kill(signal);
      });
    }
  };
  const terminator = addTerminator(() => kill("SIGKILL"));

  childProcess.on("exit", () => {
    didExit();
  });

  try {
    return await use(childProcess, { kill });
  } finally {
    await kill("SIGKILL");
  }
};
