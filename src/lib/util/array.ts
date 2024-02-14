import assert from "assert";

export const divideArray = <T>(array: T[], size: number): T[][] => {
  assert(size > 0);
  let result: T[][] = [];
  const N = array.length;
  for (let i = 0; i < N; i += size) {
    result = [...result, array.slice(i, i + size)];
  }
  return result;
};
