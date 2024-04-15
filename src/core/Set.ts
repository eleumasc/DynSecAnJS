export const equalSets = <T>(a: Set<T>, b: Set<T>): boolean =>
  a.size === b.size && [...a].every((value) => b.has(value));

export const isSubsetOf = <T>(a: Set<T>, b: Set<T>): boolean =>
  [...a].every((value) => b.has(value));

export const intersectSets = <T>(...sets: Set<T>[]): Set<T> => {
  if (sets.length === 0) {
    return new Set();
  }
  const [set0, ...setsRest] = sets;
  return new Set(
    setsRest.reduce(
      (acc, cur) => acc.filter((value) => cur.has(value)),
      [...set0]
    )
  );
};

export const subtractSets = <T>(a: Set<T>, b: Set<T>): Set<T> =>
  new Set([...a].filter((value) => !b.has(value)));
