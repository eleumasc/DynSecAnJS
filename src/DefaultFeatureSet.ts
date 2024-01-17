import { FeatureSet } from "./model";
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

  toJsonSerializable(): any {
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
}
