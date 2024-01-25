import { equalSets } from "./util/set";

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

  broken(that: FeatureSet): string[] {
    let brokenArray: string[] = [];
    if (!equalSets(this.uncaughtErrors, that.uncaughtErrors)) {
      brokenArray = [...brokenArray, "uncaughtErrors"];
    }
    if (!equalSets(this.consoleMessages, that.consoleMessages)) {
      brokenArray = [...brokenArray, "consoleMessages"];
    }
    if (!equalSets(this.calledNativeMethods, that.calledNativeMethods)) {
      brokenArray = [...brokenArray, "calledNativeMethods"];
    }
    if (!equalSets(this.cookieKeys, that.cookieKeys)) {
      brokenArray = [...brokenArray, "cookieKeys"];
    }
    if (!equalSets(this.localStorageKeys, that.localStorageKeys)) {
      brokenArray = [...brokenArray, "localStorageKeys"];
    }
    if (!equalSets(this.sessionStorageKeys, that.sessionStorageKeys)) {
      brokenArray = [...brokenArray, "sessionStorageKeys"];
    }
    if (!equalSets(this.targetSites, that.targetSites)) {
      brokenArray = [...brokenArray, "targetSites"];
    }

    return brokenArray;
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
