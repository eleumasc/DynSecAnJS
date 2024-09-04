import { ChildProcess } from "child_process";

export type Terminator = () => Promise<void>;

export interface TerminatorController {
  cancel(): void;
}

const terminators = new Set<() => Promise<void>>();

export const addTerminator = (terminator: Terminator): TerminatorController => {
  terminators.add(terminator);

  return {
    cancel() {
      terminators.delete(terminator);
    },
  };
};

export const killOnSignal = (
  childProcess: ChildProcess
): TerminatorController => {
  return addTerminator(
    () =>
      new Promise((resolve) => {
        childProcess.on("exit", resolve);

        childProcess.kill("SIGKILL");
      })
  );
};

const handler = async () => {
  await Promise.all([...terminators].map((terminator) => terminator()));

  process.exit(0);
};

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, handler);
}
