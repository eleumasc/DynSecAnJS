export const sum = (xs: number[]): number => {
  return xs.reduce((s, x) => s + x, 0);
};

export const avg = (xs: number[]): number => {
  return sum(xs) / xs.length;
};

export const stdev = (xs: number[]): number => {
  return Math.sqrt(avg(xs.map((x) => x ** 2)) - avg(xs) ** 2);
};
