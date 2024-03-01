export const sortMap = <K, V>(
  map: Map<K, V>,
  compareFn: (x: [K, V], y: [K, V]) => number
) => {
  return new Map([...map].sort(compareFn));
};
