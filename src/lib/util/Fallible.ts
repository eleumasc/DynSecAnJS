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
  cooked: Fallible<T>,
  serializeVal: (cookedVal: T) => any
): any => {
  const { status } = cooked;
  if (status === "success") {
    const { val } = cooked;
    return { status, val: serializeVal(val) };
  } else {
    const { reason } = cooked;
    return { status, reason };
  }
};

export const deserializeFallible = <T>(
  raw: any,
  deserializeVal: (rawVal: any) => T
): Fallible<T> => {
  const { status } = raw;
  if (status === "success") {
    const { val } = raw;
    return { status, val: deserializeVal(val) };
  } else if (status === "failure") {
    const { reason } = raw;
    assert(typeof reason === "string");
    return { status, reason };
  } else {
    throw new Error(`Unknown status of Fallible: ${status}`);
  }
};
