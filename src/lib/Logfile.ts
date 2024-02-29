import assert from "assert";
import {
  Fallible,
  deserializeFallible,
  serializeFallible,
} from "./util/Fallible";

export interface Logfile<Kind extends string, Data> {
  site: string;
  kind: Kind;
  data: Fallible<Data>;
}

export const serializeLogfile = <Kind extends string, Data>(
  cooked: Logfile<Kind, Data>,
  serializeData: (data: Data) => any
): any => {
  const { data, ...rest } = cooked;
  return {
    ...rest,
    data: serializeFallible(data, serializeData),
  };
};

export const deserializeLogfile = <Kind extends string, Data>(
  raw: any,
  expectedKind: Kind,
  deserializeData: (rawData: any) => Data
): Logfile<Kind, Data> => {
  const { site, kind, data } = raw;
  assert(
    kind === expectedKind,
    `Expected Logfile of kind ${expectedKind}, but got ${kind}`
  );
  return {
    site,
    kind,
    data: deserializeFallible(data, deserializeData),
  };
};
