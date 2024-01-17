const equalsSet = <T>(a: Set<T>, b: Set<T>): boolean =>
  a.size === b.size && [...a].every((value) => b.has(value));

export { equalsSet };
