import { equalSets, isSubsetOf, subtractSets } from "../core/Set";

import { ExecutionDetail } from "../lib/ExecutionDetail";

export interface ExecutionTrace {
  uncaughtErrors: Set<string>;
}

export const createExecutionTrace = (
  execution: ExecutionDetail
): ExecutionTrace => {
  const { uncaughtErrors } = execution;
  return {
    uncaughtErrors: new Set(uncaughtErrors),
  };
};

export const equalExecutionTraces = (
  x: ExecutionTrace,
  y: ExecutionTrace
): boolean => {
  return equalSets(x.uncaughtErrors, y.uncaughtErrors);
};

export const subtractExecutionTraces = (
  x: ExecutionTrace,
  y: ExecutionTrace
): ExecutionTrace => {
  return {
    uncaughtErrors: subtractSets(x.uncaughtErrors, y.uncaughtErrors),
  };
};

export const findPredominantExecutionTrace = (
  executionTraces: ExecutionTrace[],
  threshold: number
): ExecutionTrace | null => {
  const eqClasses: ExecutionTrace[][] = [];
  for (const executionTrace of executionTraces) {
    const eqClass = eqClasses.find((eqClass) =>
      equalExecutionTraces(eqClass[0], executionTrace)
    );
    if (eqClass) {
      eqClass.push(executionTrace);
    } else {
      eqClasses.push([executionTrace]);
    }
  }
  return eqClasses.find((eqClass) => eqClass.length >= threshold)?.[0] ?? null;
};

export const brokenExecutionTraces = (
  orig: ExecutionTrace,
  tool: ExecutionTrace
): Set<string> => {
  const brokenSet = new Set<string>();

  if (!isSubsetOf(tool.uncaughtErrors, orig.uncaughtErrors)) {
    brokenSet.add("uncaughtErrors");
  }

  return brokenSet;
};
