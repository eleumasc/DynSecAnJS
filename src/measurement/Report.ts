import { avg, stdev } from "../core/math";

import { SiteInfo } from "./SiteInfo";

export interface Report {
  all: number;
  accessible: number;
  analyzable: number;

  noneCompatible: number;
  syntacticallyCompatible: number;
  eventuallyCompatible: number;
  bothCompatible: number;
  _pureNonCompatible: number;
  _transpiledNonCompatible: number;
  _pureCompatible: number;
  _transpiledCompatible: number;
  unknown: number;
  originalSomeSuccessSomeFailure: number;
  toolSomeSuccessSomeFailure: number;
  transparencyAnalyzable: number;

  noneLoadingCompleted: number;
  originalLoadingCompleted: number;
  toolLoadingCompleted: number;
  bothLoadingCompleted: number;

  noneTraceExists: number;
  originalTraceExists: number;
  toolTraceExists: number;
  bothTraceExists: number;

  nonTransparent: number;
  transparent: number;

  overhead: number;
}

export const createReport = (siteInfos: SiteInfo[]): Report => {
  const all = count(siteInfos);
  const accessible = count(siteInfos, (info) => info.accessible);
  const analyzable = count(siteInfos, (info) => info.analyzable);

  const compatibilityInfos = takeInfo(
    siteInfos,
    (info) => info.analyzable,
    (info) => info.compatibility
  );
  const noneCompatible = count(
    compatibilityInfos,
    (info) => !info.syntacticallyCompatible && !info.eventuallyCompatible
  );
  const syntacticallyCompatible = count(
    compatibilityInfos,
    (info) => info.syntacticallyCompatible && !info.eventuallyCompatible
  );
  const eventuallyCompatible = count(
    compatibilityInfos,
    (info) => !info.syntacticallyCompatible && info.eventuallyCompatible
  );
  const bothCompatible = count(
    compatibilityInfos,
    (info) => info.syntacticallyCompatible && info.eventuallyCompatible
  );
  const unknown = count(
    compatibilityInfos,
    (info) => info.eventuallyCompatible && !info.loadingCompleted
  );
  const originalSomeSuccessSomeFailure = count(
    compatibilityInfos,
    (info) => info.eventuallyCompatible && info.originalSomeSuccessSomeFailure
  );
  const toolSomeSuccessSomeFailure = count(
    compatibilityInfos,
    (info) => info.eventuallyCompatible && info.toolSomeSuccessSomeFailure
  );
  const transparencyAnalyzable = count(
    compatibilityInfos,
    (info) => info.transparencyAnalyzable
  );

  const loadingCompletenessInfos = takeInfo(
    compatibilityInfos,
    (info) => info.eventuallyCompatible,
    (info) => info.loadingCompleteness
  );
  const noneLoadingCompleted = count(
    loadingCompletenessInfos,
    (info) => !info.originalLoadingCompleted && !info.toolLoadingCompleted
  );
  const originalLoadingCompleted = count(
    loadingCompletenessInfos,
    (info) => info.originalLoadingCompleted && !info.toolLoadingCompleted
  );
  const toolLoadingCompleted = count(
    loadingCompletenessInfos,
    (info) => !info.originalLoadingCompleted && info.toolLoadingCompleted
  );
  const bothLoadingCompleted = count(
    loadingCompletenessInfos,
    (info) => info.originalLoadingCompleted && info.toolLoadingCompleted
  );

  const predominantTraceExistanceInfos = takeInfo(
    loadingCompletenessInfos,
    (info) => info.originalLoadingCompleted && info.toolLoadingCompleted,
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
    (info) => info.originalTraceExists && info.toolTraceExists,
    (info) => info.transparency
  );
  const nonTransparent = count(transparencyInfos, (info) => !info.transparent);
  const transparent = count(transparencyInfos, (info) => info.transparent);

  const performanceInfos = takeInfo(
    transparencyInfos,
    (info) => info.transparent,
    (info) => info.performance
  );
  const overhead = avg(
    performanceInfos.map(
      (info) => info.toolExecutionTimeMs / info.originalExecutionTimeMs
    )
  );

  return {
    all,
    accessible,
    analyzable,

    noneCompatible,
    syntacticallyCompatible,
    eventuallyCompatible,
    bothCompatible,
    _pureNonCompatible: syntacticallyCompatible,
    _transpiledNonCompatible: noneCompatible,
    _pureCompatible: bothCompatible,
    _transpiledCompatible: eventuallyCompatible,
    unknown,
    originalSomeSuccessSomeFailure,
    toolSomeSuccessSomeFailure,
    transparencyAnalyzable,

    noneLoadingCompleted,
    originalLoadingCompleted,
    toolLoadingCompleted,
    bothLoadingCompleted,

    noneTraceExists,
    originalTraceExists,
    toolTraceExists,
    bothTraceExists,

    nonTransparent,
    transparent,

    overhead,
  };
};

const count = <T>(
  population: T[],
  filterFn?: (element: T) => boolean
): number => {
  return filterFn
    ? population.filter((element) => filterFn(element)).length
    : population.length;
};

const takeInfo = <T, U>(
  population: T[],
  filterFn: (element: T) => boolean,
  mapFn: (element: T) => U | null
): U[] => {
  return population
    .filter((element) => filterFn(element))
    .map((element) => mapFn(element))
    .filter((element): element is U => element !== null);
};
