import _ from "lodash";

export const avg = (xs: number[]): number => {
  return _.sum(xs) / xs.length;
};

export const stdev = (xs: number[]): number => {
  return Math.sqrt(avg(xs.map((x) => x ** 2)) - avg(xs) ** 2);
};
