export const equalSets = <T>(a: Set<T>, b: Set<T>): boolean =>
  a.size === b.size && [...a].every((value) => b.has(value));

export const isSubsetOf = <T>(a: Set<T>, b: Set<T>): boolean =>
  [...a].every((value) => b.has(value));

export const intersectSets = <T>(a: Set<T>, b: Set<T>): Set<T> =>
  new Set([...a].filter((value) => b.has(value)));
