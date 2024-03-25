import { equalSets, isSubsetOf } from "../util/set";

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
    return (
      equalSets(this.uncaughtErrors, that.uncaughtErrors) &&
      equalSets(this.consoleMessages, that.consoleMessages) &&
      // equalSets(this.calledBuiltinMethods, that.calledBuiltinMethods) &&
      equalSets(that.cookieKeys, this.cookieKeys) &&
      equalSets(that.localStorageKeys, this.localStorageKeys) &&
      equalSets(that.sessionStorageKeys, this.sessionStorageKeys) &&
      equalSets(that.targetSites, this.targetSites) &&
      equalSets(that.includedScriptUrls, this.includedScriptUrls)
    );
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
