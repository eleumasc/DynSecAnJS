import {
  CountMatchedKeysResult,
  count,
  countMatchedKeys,
  takeInfo,
} from "./util";
import {
  IncompatibilityAnalysisResult,
  executeIncompatibilityAnalysis,
} from "./executeIncompatibilityAnalysis";

import { CompatibilityIssue } from "./findCompatibilityIssues";
import { ErrorType } from "./findErrorTypes";
import { SiteInfo } from "./SiteInfo";

export interface Report {
  // SiteInfo
  all: number;
  accessible: number;
  // CompatibilityInfo
  syntacticallyCompatible: number;
  compatible: number;
  eventuallyCompatible: number;
  unknownCompatible: number;
  unknownEventuallyCompatible: number;
  transpilationOK: number;
  transpilationKO: number;
  originalSomeSuccessSomeFailure: number;
  toolSomeSuccessSomeFailure: number;
  compatibilityIssues: CountMatchedKeysResult;
  incompatibilityAnalysisResult: IncompatibilityAnalysisResult;
  transparencyAnalyzable: number;
  // TransparencyInfo
  nonTransparent: number;
  transparent: number;
  uncaughtErrorTypes: CountMatchedKeysResult;
}

export const getReport = (siteInfoList: SiteInfo[]): Report => {
  const all = count(siteInfoList);
  const accessible = count(siteInfoList, (info) => info.accessible);

  const compatibilityInfoArray = takeInfo(
    siteInfoList,
    (info) => info.compatibility
  );
  const syntacticallyCompatible = count(
    compatibilityInfoArray,
    (info) => info.syntacticallyCompatible
  );
  const compatible = count(
    compatibilityInfoArray,
    (info) => info.syntacticallyCompatible && info.eventuallyCompatible === true
  );
  const eventuallyCompatible = count(
    compatibilityInfoArray,
    (info) => info.eventuallyCompatible === true
  );
  const unknownCompatible = count(
    compatibilityInfoArray,
    (info) => info.syntacticallyCompatible && info.eventuallyCompatible === null
  );
  const unknownEventuallyCompatible = count(
    compatibilityInfoArray,
    (info) => info.eventuallyCompatible === null
  );
  const transpilationOK = count(
    compatibilityInfoArray,
    (info) => info.transpilationOK
  );
  const transpilationKO = count(
    compatibilityInfoArray,
    (info) => info.transpilationKO
  );
  const originalSomeSuccessSomeFailure = count(
    compatibilityInfoArray,
    (info) => info.originalSomeSuccessSomeFailure
  );
  const toolSomeSuccessSomeFailure = count(
    compatibilityInfoArray,
    (info) => info.toolSomeSuccessSomeFailure
  );
  const compatibilityIssues = countMatchedKeys(
    compatibilityInfoArray.map((info) => info.issues),
    new Set(Object.values(CompatibilityIssue))
  );
  const incompatibilityAnalysisResult = executeIncompatibilityAnalysis(
    compatibilityInfoArray
  );
  const transparencyAnalyzable = count(
    compatibilityInfoArray,
    (info) => info.transparencyAnalyzable
  );

  const transparencyInfoArray = takeInfo(
    compatibilityInfoArray,
    (info) => info.transparency
  );
  const nonTransparent = count(
    transparencyInfoArray,
    (info) => !info.transparent
  );
  const transparent = count(transparencyInfoArray, (info) => info.transparent);
  const uncaughtErrorTypes = countMatchedKeys(
    transparencyInfoArray.map((info) => info.uncaughtErrorTypes),
    new Set(Object.values(ErrorType))
  );

  return {
    // SiteInfo
    all,
    accessible,
    // CompatibilityInfo
    syntacticallyCompatible,
    compatible,
    eventuallyCompatible,
    unknownCompatible,
    unknownEventuallyCompatible,
    transpilationOK,
    transpilationKO,
    originalSomeSuccessSomeFailure,
    toolSomeSuccessSomeFailure,
    compatibilityIssues,
    incompatibilityAnalysisResult,
    transparencyAnalyzable,
    // TransparencyInfo
    nonTransparent,
    transparent,
    uncaughtErrorTypes,
  };
};
