import {
  CountMatchedKeysResult,
  count,
  countMatchedKeys,
  takeInfo,
} from "./util";

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
  unknownCompatibility: number;
  transpilationOK: number;
  transpilationKO: number;
  originalSomeSuccessSomeFailure: number;
  toolSomeSuccessSomeFailure: number;
  compatibilityIssues: CountMatchedKeysResult;
  transparencyAnalyzable: number;
  // PredominantTraceExistanceInfo
  noneTraceExists: number;
  originalTraceExists: number;
  toolTraceExists: number;
  bothTraceExists: number;
  // TransparencyInfo
  nonTransparent: number;
  transparent: number;
  uncaughtErrorTypes: CountMatchedKeysResult;
}

export const getReport = (siteInfoList: SiteInfo[]): Report => {
  const all = count(siteInfoList);
  const accessible = count(siteInfoList, (info) => info.accessible);

  const compatibilityInfos = takeInfo(
    siteInfoList,
    (info) => info.compatibility
  );
  const syntacticallyCompatible = count(
    compatibilityInfos,
    (info) => info.syntacticallyCompatible
  );
  const compatible = count(
    compatibilityInfos,
    (info) => info.syntacticallyCompatible && info.eventuallyCompatible === true
  );
  const eventuallyCompatible = count(
    compatibilityInfos,
    (info) => info.eventuallyCompatible === true
  );
  const unknownCompatibility = count(
    compatibilityInfos,
    (info) => info.eventuallyCompatible === null
  );
  const transpilationOK = count(
    compatibilityInfos,
    (info) => info.transpilationOK
  );
  const transpilationKO = count(
    compatibilityInfos,
    (info) => info.transpilationKO
  );
  const originalSomeSuccessSomeFailure = count(
    compatibilityInfos,
    (info) => info.originalSomeSuccessSomeFailure
  );
  const toolSomeSuccessSomeFailure = count(
    compatibilityInfos,
    (info) => info.toolSomeSuccessSomeFailure
  );
  const compatibilityIssues = countMatchedKeys(
    compatibilityInfos.map((info) => info.issues),
    new Set(Object.values(CompatibilityIssue))
  );
  const transparencyAnalyzable = count(
    compatibilityInfos,
    (info) => info.transparencyAnalyzable
  );

  const predominantTraceExistanceInfos = takeInfo(
    compatibilityInfos,
    (info) => info.predominantTraceExistance
  );
  const noneTraceExists = count(
    predominantTraceExistanceInfos,
    (info) => !info.originalTraceExists && !info.toolTraceExists
  );
  const originalTraceExists = count(
    predominantTraceExistanceInfos,
    (info) => info.originalTraceExists && !info.toolTraceExists
  );
  const toolTraceExists = count(
    predominantTraceExistanceInfos,
    (info) => !info.originalTraceExists && info.toolTraceExists
  );
  const bothTraceExists = count(
    predominantTraceExistanceInfos,
    (info) => info.originalTraceExists && info.toolTraceExists
  );

  const transparencyInfos = takeInfo(
    predominantTraceExistanceInfos,
    (info) => info.transparency
  );
  const nonTransparent = count(transparencyInfos, (info) => !info.transparent);
  const transparent = count(transparencyInfos, (info) => info.transparent);
  const uncaughtErrorTypes = countMatchedKeys(
    transparencyInfos.map((info) => info.uncaughtErrorTypes),
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
    unknownCompatibility,
    transpilationOK,
    transpilationKO,
    originalSomeSuccessSomeFailure,
    toolSomeSuccessSomeFailure,
    compatibilityIssues,
    transparencyAnalyzable,
    // PredominantTraceExistanceInfo
    noneTraceExists,
    originalTraceExists,
    toolTraceExists,
    bothTraceExists,
    // TransparencyInfo
    nonTransparent,
    transparent,
    uncaughtErrorTypes,
  };
};
