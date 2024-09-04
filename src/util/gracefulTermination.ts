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

process.on("exit", async () => {
  await Promise.all([...terminators].map((terminator) => terminator()));
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    process.exit(0);
  });
}
