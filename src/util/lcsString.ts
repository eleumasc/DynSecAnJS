export interface LCSStringMatch {
  str: string;
  offset1: number;
  offset2: number;
}

export const lcsString = (
  str1: string,
  str2: string
): LCSStringMatch | undefined => {
  const N1 = str1.length;
  const N2 = str2.length;
  let offset1 = -1;
  let offset2 = -1;
  let length = 0;
  for (let i = 0, k = 0; i < N1; i += k > 0 ? k : 1) {
    for (let j = 0; i + k < N1 && j < N2; j += 1) {
      if (str1[i + k] === str2[j]) {
        k += 1;
        if (k > length) {
          offset1 = i;
          offset2 = j - k + 1;
          length = k;
        }
      } else {
        k = 0;
      }
    }
  }
  return length > 0
    ? { str: str1.substring(offset1, offset1 + length), offset1, offset2 }
    : undefined;
};
