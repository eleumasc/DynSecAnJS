import { incrementMapEntry } from "../core/Map";

export const count = <T>(
  population: T[],
  filterFn?: (element: T) => boolean
): number => {
  return filterFn
    ? population.filter((element) => filterFn(element)).length
    : population.length;
};

export interface CountMatchedKeysResult {
  matchedKeysCount: Map<string, number>;
  unmatchedKeys: Set<string>;
}

export const countMatchedKeys = (
  keySets: Set<string>[],
  matchingKeys: Set<string>
): CountMatchedKeysResult => {
  const matchedKeysCount = new Map<string, number>(
    [...matchingKeys].map((key) => [key, 0])
  );
  const unmatchedKeys = new Set<string>();

  for (const keySet of keySets) {
    for (const key of keySet) {
      if (matchingKeys.has(key)) {
        incrementMapEntry(matchedKeysCount, key);
      } else {
        unmatchedKeys.add(key);
      }
    }
  }

  return { matchedKeysCount, unmatchedKeys };
};

export const takeInfo = <T, U>(
  population: T[],
  mapFn: (element: T) => U | null
): U[] => {
  return population
    .map((element) => mapFn(element))
    .filter((element): element is U => element !== null);
};
