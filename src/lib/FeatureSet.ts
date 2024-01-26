import { equalSets, intersectSets } from "./util/set";

export interface FeatureSetData {
  type: "DefaultFeatureSet";
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledNativeMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  targetSites: string[];
}

export default class FeatureSet {
  constructor(
    readonly uncaughtErrors: Set<string>,
    readonly consoleMessages: Set<string>,
    readonly calledNativeMethods: Set<string>,
    readonly cookieKeys: Set<string>,
    readonly localStorageKeys: Set<string>,
    readonly sessionStorageKeys: Set<string>,
    readonly targetSites: Set<string>
  ) {}

  equals(that: FeatureSet): boolean {
    return (
      equalSets(this.uncaughtErrors, that.uncaughtErrors) &&
      equalSets(this.consoleMessages, that.consoleMessages) &&
      equalSets(this.calledNativeMethods, that.calledNativeMethods) &&
      equalSets(this.cookieKeys, that.cookieKeys) &&
      equalSets(this.localStorageKeys, that.localStorageKeys) &&
      equalSets(this.sessionStorageKeys, that.sessionStorageKeys) &&
      equalSets(this.targetSites, that.targetSites)
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
    if (!equalSets(this.calledNativeMethods, that.calledNativeMethods)) {
      brokenSet.add("calledNativeMethods");
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

    return brokenSet;
  }

  intersect(that: FeatureSet): FeatureSet {
    return new FeatureSet(
      intersectSets(this.uncaughtErrors, that.uncaughtErrors),
      intersectSets(this.consoleMessages, that.consoleMessages),
      intersectSets(this.calledNativeMethods, that.calledNativeMethods),
      intersectSets(this.cookieKeys, that.cookieKeys),
      intersectSets(this.localStorageKeys, that.localStorageKeys),
      intersectSets(this.sessionStorageKeys, that.sessionStorageKeys),
      intersectSets(this.targetSites, that.targetSites)
    );
  }

  serialize(): FeatureSetData {
    return {
      type: "DefaultFeatureSet",
      uncaughtErrors: [...this.uncaughtErrors],
      consoleMessages: [...this.consoleMessages],
      calledNativeMethods: [...this.calledNativeMethods],
      cookieKeys: [...this.cookieKeys],
      localStorageKeys: [...this.localStorageKeys],
      sessionStorageKeys: [...this.sessionStorageKeys],
      targetSites: [...this.targetSites],
    };
  }

  static deserialize(data: FeatureSetData): FeatureSet {
    const {
      uncaughtErrors,
      consoleMessages,
      calledNativeMethods,
      cookieKeys,
      localStorageKeys,
      sessionStorageKeys,
      targetSites,
    } = data;
    return new FeatureSet(
      new Set(uncaughtErrors),
      new Set(consoleMessages),
      new Set(calledNativeMethods),
      new Set(cookieKeys),
      new Set(localStorageKeys),
      new Set(sessionStorageKeys),
      new Set(targetSites)
    );
  }
}
