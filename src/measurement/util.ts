import _ from "lodash";

export const computePopularityRanking = <T>(
  elements: T[],
  keysFn: (element: T) => string[]
): [string, number][] => {
  const map = new Map<string, number>();
  for (const element of elements) {
    for (const key of keysFn(element)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return _.sortBy([...map], ([_, popularity]) => popularity).reverse();
};

export const count = <T>(
  elements: T[],
  filterFn: (element: T) => boolean
): number => {
  return elements.filter((element) => filterFn(element)).length;
};
