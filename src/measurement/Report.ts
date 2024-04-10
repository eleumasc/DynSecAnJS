import { SiteInfo } from "./SiteInfo";
import { avg } from "../core/math";

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
  unknownCompatibility: number;
  originalSomeSuccessSomeFailure: number;
  toolSomeSuccessSomeFailure: number;
  transparencyAnalyzable: number;

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

  const compatibilityInfos = takeInfo(siteInfos, (info) => info.compatibility);
  const noneCompatible = count(
    compatibilityInfos,
    (info) =>
      !info.syntacticallyCompatible && info.eventuallyCompatible === false
  );
  const syntacticallyCompatible = count(
    compatibilityInfos,
    (info) =>
      info.syntacticallyCompatible && info.eventuallyCompatible === false
  );
  const eventuallyCompatible = count(
    compatibilityInfos,
    (info) =>
      !info.syntacticallyCompatible && info.eventuallyCompatible === true
  );
  const bothCompatible = count(
    compatibilityInfos,
    (info) => info.syntacticallyCompatible && info.eventuallyCompatible === true
  );
  const unknownCompatibility = count(
    compatibilityInfos,
    (info) => info.eventuallyCompatible === null
  );
  const originalSomeSuccessSomeFailure = count(
    compatibilityInfos,
    (info) => info.originalSomeSuccessSomeFailure
  );
  const toolSomeSuccessSomeFailure = count(
    compatibilityInfos,
    (info) => info.toolSomeSuccessSomeFailure
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

  const performanceInfos = takeInfo(
    transparencyInfos,
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
    unknownCompatibility,
    originalSomeSuccessSomeFailure,
    toolSomeSuccessSomeFailure,
    transparencyAnalyzable,

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
  mapFn: (element: T) => U | null
): U[] => {
  return population
    .map((element) => mapFn(element))
    .filter((element): element is U => element !== null);
};
