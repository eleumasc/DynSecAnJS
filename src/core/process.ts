import { ChildProcess } from "child_process";
import Deferred from "./Deferred";
import { timeBomb } from "./async";

const deferredTerminate = new Deferred<void>();
const _handleTerminationSignal = () => {
  deferredTerminate.resolve();
};
export const setupManualTerminationHandling = () => {
  process.on("SIGINT", _handleTerminationSignal);
  process.on("SIGTERM", _handleTerminationSignal);
};
export const waitForTerminationSignal = () => deferredTerminate.promise;

export interface UseChildProcessOptions {
  childProcess: ChildProcess;
  terminate: (childProcess: ChildProcess) => Promise<void>;
}

export const useChildProcess = async <T>(
  options: UseChildProcessOptions,
  cb: (childProcess: ChildProcess) => Promise<T>
): Promise<T> => {
  const { childProcess, terminate } = options;

  let exited = false;
  const deferredTerminate = new Deferred<void>();
  childProcess.on("exit", () => {
    exited = true;
    deferredTerminate.resolve();
  });

  try {
    return await cb(childProcess);
  } finally {
    if (!exited) {
      await terminate(childProcess);
    }
    try {
      await timeBomb(deferredTerminate.promise, 5_000);
    } catch {
      childProcess.kill("SIGKILL");
    }
  }
};
