import _ from "lodash";

export interface ExecutionTrace {
  uncaughtErrors: Set<string>;
}

export const isEqualExecutionTrace = (
  x: ExecutionTrace,
  y: ExecutionTrace
): boolean => {
  return _.isEqual(x.uncaughtErrors, y.uncaughtErrors);
};

export const differenceExecutionTrace = (
  x: ExecutionTrace,
  y: ExecutionTrace
): ExecutionTrace => {
  return {
    uncaughtErrors: new Set(
      _.difference([...x.uncaughtErrors], [...y.uncaughtErrors])
    ),
  };
};

export const findPredominantExecutionTrace = (
  executionTraces: ExecutionTrace[]
): ExecutionTrace | null => {
  const threshold = (executionTraces.length >> 1) + 1;

  const eqClasses: ExecutionTrace[][] = [];
  for (const executionTrace of executionTraces) {
    const eqClass = eqClasses.find((eqClass) =>
      isEqualExecutionTrace(eqClass[0], executionTrace)
    );
    if (eqClass) {
      eqClass.push(executionTrace);
    } else {
      eqClasses.push([executionTrace]);
    }
  }
  return eqClasses.find((eqClass) => eqClass.length >= threshold)?.[0] ?? null;
};
