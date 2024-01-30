import { equalSets, intersectSets } from "./util/set";

export interface FeatureSetData {
  type: "DefaultFeatureSet";
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
    return (
      equalSets(this.uncaughtErrors, that.uncaughtErrors) &&
      equalSets(this.consoleMessages, that.consoleMessages) &&
      equalSets(this.calledBuiltinMethods, that.calledBuiltinMethods) &&
      equalSets(this.cookieKeys, that.cookieKeys) &&
      equalSets(this.localStorageKeys, that.localStorageKeys) &&
      equalSets(this.sessionStorageKeys, that.sessionStorageKeys) &&
      equalSets(this.targetSites, that.targetSites) &&
      equalSets(this.includedScriptUrls, that.includedScriptUrls)
    );
  }

  broken(that: FeatureSet): Set<string> {
    const brokenSet = new Set<string>();

    if (!equalSets(this.uncaughtErrors, that.uncaughtErrors)) {
      brokenSet.add("uncaughtErrors");
    }
    if (!equalSets(this.consoleMessages, that.consoleMessages)) {
      brokenSet.add("consoleMessages");
    }
    if (!equalSets(this.calledBuiltinMethods, that.calledBuiltinMethods)) {
      brokenSet.add("calledBuiltinMethods");
    }
    if (!equalSets(this.cookieKeys, that.cookieKeys)) {
      brokenSet.add("cookieKeys");
    }
    if (!equalSets(this.localStorageKeys, that.localStorageKeys)) {
      brokenSet.add("localStorageKeys");
    }
    if (!equalSets(this.sessionStorageKeys, that.sessionStorageKeys)) {
      brokenSet.add("sessionStorageKeys");
    }
    if (!equalSets(this.targetSites, that.targetSites)) {
      brokenSet.add("targetSites");
    }
    if (!equalSets(this.includedScriptUrls, that.includedScriptUrls)) {
      brokenSet.add("includedScriptUrls");
    }

    return brokenSet;
  }

  intersect(that: FeatureSet): FeatureSet {
    return new FeatureSet(
      intersectSets(this.uncaughtErrors, that.uncaughtErrors),
      intersectSets(this.consoleMessages, that.consoleMessages),
      intersectSets(this.calledBuiltinMethods, that.calledBuiltinMethods),
      intersectSets(this.cookieKeys, that.cookieKeys),
      intersectSets(this.localStorageKeys, that.localStorageKeys),
      intersectSets(this.sessionStorageKeys, that.sessionStorageKeys),
      intersectSets(this.targetSites, that.targetSites),
      intersectSets(this.includedScriptUrls, that.includedScriptUrls)
    );
  }

  serialize(): FeatureSetData {
    return {
      type: "DefaultFeatureSet",
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

  static deserialize(data: FeatureSetData): FeatureSet {
    const {
      uncaughtErrors,
      consoleMessages,
      calledBuiltinMethods,
      cookieKeys,
      localStorageKeys,
      sessionStorageKeys,
      targetSites,
      includedScriptUrls,
    } = data;
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
