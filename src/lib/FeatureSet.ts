import { equalsSet } from "./util/set";

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
      equalsSet(this.uncaughtErrors, that.uncaughtErrors) &&
      equalsSet(this.consoleMessages, that.consoleMessages) &&
      equalsSet(this.calledNativeMethods, that.calledNativeMethods) &&
      equalsSet(this.cookieKeys, that.cookieKeys) &&
      equalsSet(this.localStorageKeys, that.localStorageKeys) &&
      equalsSet(this.sessionStorageKeys, that.sessionStorageKeys) &&
      equalsSet(this.targetSites, that.targetSites)
    );
  }

  broken(that: FeatureSet): string[] {
    let brokenArray: string[] = [];
    if (!equalsSet(this.uncaughtErrors, that.uncaughtErrors)) {
      brokenArray = [...brokenArray, "uncaughtErrors"];
    }
    if (!equalsSet(this.consoleMessages, that.consoleMessages)) {
      brokenArray = [...brokenArray, "consoleMessages"];
    }
    if (!equalsSet(this.calledNativeMethods, that.calledNativeMethods)) {
      brokenArray = [...brokenArray, "calledNativeMethods"];
    }
    if (!equalsSet(this.cookieKeys, that.cookieKeys)) {
      brokenArray = [...brokenArray, "cookieKeys"];
    }
    if (!equalsSet(this.localStorageKeys, that.localStorageKeys)) {
      brokenArray = [...brokenArray, "localStorageKeys"];
    }
    if (!equalsSet(this.sessionStorageKeys, that.sessionStorageKeys)) {
      brokenArray = [...brokenArray, "sessionStorageKeys"];
    }
    if (!equalsSet(this.targetSites, that.targetSites)) {
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
