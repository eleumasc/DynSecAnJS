import { equalSets } from "./util/set";

export interface FeatureSetData {
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledBuiltinMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  targetSites: string[];
  includedScriptUrls: string[];
}

export default class FeatureSet {
  constructor(
    readonly uncaughtErrors: Set<string>,
    readonly consoleMessages: Set<string>,
    readonly calledBuiltinMethods: Set<string>,
    readonly cookieKeys: Set<string>,
    readonly localStorageKeys: Set<string>,
    readonly sessionStorageKeys: Set<string>,
    readonly targetSites: Set<string>,
    readonly includedScriptUrls: Set<string>
  ) {}

  equals(that: FeatureSet): boolean {
    return this.broken(that).size === 0;
  }

  broken(that: FeatureSet): Set<string> {
    const brokenSet = new Set<string>();

    if (!equalSets(this.uncaughtErrors, that.uncaughtErrors)) {
      brokenSet.add("uncaughtErrors");
    }
    if (!equalSets(this.consoleMessages, that.consoleMessages)) {
      brokenSet.add("consoleMessages");
    }
    // if (!equalSets(this.calledBuiltinMethods, that.calledBuiltinMethods)) {
    //   brokenSet.add("calledBuiltinMethods");
    // }
    // if (!equalSets(this.cookieKeys, that.cookieKeys)) {
    //   brokenSet.add("cookieKeys");
    // }
    // if (!equalSets(this.localStorageKeys, that.localStorageKeys)) {
    //   brokenSet.add("localStorageKeys");
    // }
    // if (!equalSets(this.sessionStorageKeys, that.sessionStorageKeys)) {
    //   brokenSet.add("sessionStorageKeys");
    // }
    // if (!equalSets(this.targetSites, that.targetSites)) {
    //   brokenSet.add("targetSites");
    // }
    // if (!equalSets(this.includedScriptUrls, that.includedScriptUrls)) {
    //   brokenSet.add("includedScriptUrls");
    // }

    return brokenSet;
  }

  serialize(): any {
    return {
      uncaughtErrors: [...this.uncaughtErrors],
      consoleMessages: [...this.consoleMessages],
      calledBuiltinMethods: [...this.calledBuiltinMethods],
      cookieKeys: [...this.cookieKeys],
      localStorageKeys: [...this.localStorageKeys],
      sessionStorageKeys: [...this.sessionStorageKeys],
      targetSites: [...this.targetSites],
      includedScriptUrls: [...this.includedScriptUrls],
    };
  }

  static deserialize(raw: any): FeatureSet {
    const {
      uncaughtErrors,
      consoleMessages,
      calledBuiltinMethods,
      cookieKeys,
      localStorageKeys,
      sessionStorageKeys,
      targetSites,
      includedScriptUrls,
    } = raw;
    return new FeatureSet(
      new Set(uncaughtErrors),
      new Set(consoleMessages),
      new Set(calledBuiltinMethods),
      new Set(cookieKeys),
      new Set(localStorageKeys),
      new Set(sessionStorageKeys),
      new Set(targetSites),
      new Set(includedScriptUrls)
    );
  }
}
