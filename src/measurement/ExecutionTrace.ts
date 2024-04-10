import { equalSets, isSubsetOf, subtractSets } from "../core/Set";

import { ExecutionDetail } from "../lib/ExecutionDetail";

export interface ExecutionTrace {
  uncaughtErrors: Set<string>;
  // consoleMessages: Set<string>;
  // calledBuiltinMethods: Set<string>;
  // cookieKeys: Set<string>;
  // localStorageKeys: Set<string>;
  // sessionStorageKeys: Set<string>;
  // targetSites: Set<string>;
  // includedScriptUrls: Set<string>;
}

export const createExecutionTrace = (
  execution: ExecutionDetail
): ExecutionTrace => {
  const {
    uncaughtErrors,
    // consoleMessages,
    // calledBuiltinMethods,
    // cookieKeys,
    // localStorageKeys,
    // sessionStorageKeys,
    // targetSites,
    // includedScriptUrls,
  } = execution;
  return {
    uncaughtErrors: new Set(uncaughtErrors),
    // consoleMessages: new Set(consoleMessages),
    // calledBuiltinMethods: new Set(calledBuiltinMethods),
    // cookieKeys: new Set(cookieKeys),
    // localStorageKeys: new Set(localStorageKeys),
    // sessionStorageKeys: new Set(sessionStorageKeys),
    // targetSites: new Set(targetSites),
    // includedScriptUrls: new Set(includedScriptUrls),
  };
};

export const equalExecutionTraces = (
  x: ExecutionTrace,
  y: ExecutionTrace
): boolean => {
  return equalSets(x.uncaughtErrors, y.uncaughtErrors);
  // equalSets(x.consoleMessages, y.consoleMessages) &&
  // equalSets(x.calledBuiltinMethods, y.calledBuiltinMethods) &&
  // equalSets(x.cookieKeys, y.cookieKeys) &&
  // equalSets(x.localStorageKeys, y.localStorageKeys) &&
  // equalSets(x.sessionStorageKeys, y.sessionStorageKeys) &&
  // equalSets(x.targetSites, y.targetSites) &&
  // equalSets(x.includedScriptUrls, y.includedScriptUrls)
};

export const subtractExecutionTraces = (
  x: ExecutionTrace,
  y: ExecutionTrace
): ExecutionTrace => {
  return {
    uncaughtErrors: subtractSets(x.uncaughtErrors, y.uncaughtErrors),
    // consoleMessages: subtractSets(x.consoleMessages, y.consoleMessages),
    // calledBuiltinMethods: subtractSets(x.calledBuiltinMethods, y.calledBuiltinMethods),
    // cookieKeys: subtractSets(x.cookieKeys, y.cookieKeys),
    // localStorageKeys: subtractSets(x.localStorageKeys, y.localStorageKeys),
    // sessionStorageKeys: subtractSets(
    //   x.sessionStorageKeys,
    //   y.sessionStorageKeys
    // ),
    // targetSites: subtractSets(x.targetSites, y.targetSites),
    // includedScriptUrls: subtractSets(
    //   x.includedScriptUrls,
    //   y.includedScriptUrls
    // ),
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
  // if (!isSubsetOf(tool.consoleMessages, orig.consoleMessages)) {
  //   brokenSet.add("consoleMessages");
  // }
  // if (!equalSets(orig.calledBuiltinMethods, tool.calledBuiltinMethods)) {
  //   brokenSet.add("calledBuiltinMethods");
  // }
  // if (!isSubsetOf(tool.cookieKeys, orig.cookieKeys)) {
  //   brokenSet.add("cookieKeys");
  // }
  // if (!isSubsetOf(tool.localStorageKeys, orig.localStorageKeys)) {
  //   brokenSet.add("localStorageKeys");
  // }
  // if (!isSubsetOf(tool.sessionStorageKeys, orig.sessionStorageKeys)) {
  //   brokenSet.add("sessionStorageKeys");
  // }
  // if (!isSubsetOf(tool.targetSites, orig.targetSites)) {
  //   brokenSet.add("targetSites");
  // }
  // if (!isSubsetOf(tool.includedScriptUrls, orig.includedScriptUrls)) {
  //   brokenSet.add("includedScriptUrls");
  // }

  return brokenSet;
};
