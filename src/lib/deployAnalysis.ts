import { Analysis } from "./Analysis";

export interface Options {
  concurrencyLevel: number;
}

export const deployAnalysis = async <TAnalysis extends Analysis<any, any>>(
  analysisFactory: () => TAnalysis,
  options: Options,
  tasks: Iterable<(analysis: TAnalysis) => Promise<void>>
): Promise<void> => {
  const { concurrencyLevel } = options;

  const generator = (function* () {
    for (const task of tasks) {
      yield task;
    }
  })();

  const processNext = async (analysis: TAnalysis) => {
    const it = generator.next();
    if (it.done) {
      return false;
    }
    const task = it.value;
    try {
      await task(analysis);
    } catch {}
    return true;
  };

  await Promise.all(
    Array(concurrencyLevel)
      .fill(undefined)
      .map(async () => {
        const analysis = analysisFactory();
        while (await processNext(analysis));
        await analysis.terminate();
      })
  );
};
