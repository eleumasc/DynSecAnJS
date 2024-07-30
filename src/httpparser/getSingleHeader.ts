import { HeaderMap } from "./HttpMessageModel";
import assert from "assert";

export const getSingleHeader = (
  headers: HeaderMap,
  key: string
): string | undefined => {
  const values = headers.get(key);
  if (values === undefined) {
    return undefined;
  }
  assert(values.length === 1);
  return values[0];
};
