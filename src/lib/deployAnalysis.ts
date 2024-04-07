import { Analysis } from "./Analysis";

export interface Options {
  concurrencyLevel: number;
}

export const deployAnalysis = async <T extends Analysis>(
  analysis: T,
  options: Options,
  tasks: Iterable<(analysis: T) => Promise<void>>
): Promise<void> => {
  const { concurrencyLevel } = options;

  const generator = (function* () {
    for (const task of tasks) {
      yield task;
    }
  })();

  const processNext = async (analysis: T) => {
    const it = generator.next();
    if (it.done) {
      return false;
    }
    const task = it.value;
    await task(analysis);
    return true;
  };

  await Promise.all(
    Array(concurrencyLevel)
      .fill(undefined)
      .map(async () => {
        while (await processNext(analysis));
      })
  );
};
