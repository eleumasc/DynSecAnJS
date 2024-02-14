import assert from "assert";

interface BaseFallible {
  status: "success" | "failure";
}

export interface Success<T> extends BaseFallible {
  status: "success";
  val: T;
}

export interface Failure extends BaseFallible {
  status: "failure";
  reason: string;
}

export type Fallible<T> = Success<T> | Failure;

export const isSuccess = <T>(fallible: Fallible<T>): fallible is Success<T> => {
  return fallible.status === "success";
};

export const isFailure = <T>(fallible: Fallible<T>): fallible is Failure => {
  return fallible.status === "failure";
};

export const serializeFallible = <T>(
  concrete: Fallible<T>,
  serializeVal: (val: T) => any
): any => {
  const { status } = concrete;
  if (status === "success") {
    const { val } = concrete;
    return { status, val: serializeVal(val) };
  } else {
    const { reason } = concrete;
    return { status, reason };
  }
};

export const deserializeFallible = <T>(
  data: any,
  deserializeVal: (valData: any) => T
): Fallible<T> => {
  const { status } = data;
  if (status === "success") {
    const { val } = data;
    return { status, val: deserializeVal(val) };
  } else if (status === "failure") {
    const { reason } = data;
    assert(typeof reason === "string");
    return { status, reason };
  } else {
    throw new Error(`Unknown status of Fallible: ${status}`);
  }
};
