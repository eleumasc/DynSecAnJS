export const sortMap = <K, V>(
  map: Map<K, V>,
  compareFn: (x: [K, V], y: [K, V]) => number
) => {
  return new Map([...map].sort(compareFn));
};

export const sortCountingMap = <K>(map: Map<K, number>, order: 1 | -1 = 1) => {
  return new Map([...map].sort(([_1, v1], [_2, v2]) => order * (v1 - v2)));
};

export const incrementMapEntry = <K>(map: Map<K, number>, key: K): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};
