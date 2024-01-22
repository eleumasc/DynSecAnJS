import { FeatureSet } from "./FeatureSet";
import { equalsSet } from "./util/set";

export class DefaultFeatureSet implements FeatureSet {
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
    if (!(that instanceof DefaultFeatureSet)) {
      return false;
    }

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
    if (!(that instanceof DefaultFeatureSet)) {
      throw new Error("Cannot compare with FeatureSet of different type");
    }

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

  toData(): any {
    return {
      uncaughtErrors: [...this.uncaughtErrors],
      consoleMessages: [...this.consoleMessages],
      calledNativeMethods: [...this.calledNativeMethods],
      cookieKeys: [...this.cookieKeys],
      localStorageKeys: [...this.localStorageKeys],
      sessionStorageKeys: [...this.sessionStorageKeys],
      targetSites: [...this.targetSites],
    };
  }

  static fromData(data: any) {
    const {
      uncaughtErrors,
      consoleMessages,
      calledNativeMethods,
      cookieKeys,
      localStorageKeys,
      sessionStorageKeys,
      targetSites,
    } = data;
    return new DefaultFeatureSet(
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
