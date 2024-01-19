export const intersect = <T>(a: T[], b: T[]): T[] => {
  return a.filter((element) => b.includes(element));
};
