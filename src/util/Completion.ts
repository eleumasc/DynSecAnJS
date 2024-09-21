interface BaseCompletion {
  status: "success" | "failure";
}

export interface Success<T> extends BaseCompletion {
  status: "success";
  value: T;
}

export interface Failure extends BaseCompletion {
  status: "failure";
  error: { type: string; message: string };
}

export type Completion<T> = Success<T> | Failure;

export const Success = <T>(value: T): Success<T> => {
  return { status: "success", value };
};

export const Failure = (error: Failure["error"]): Failure => {
  return { status: "failure", error };
};

export const isSuccess = <T>(
  completion: Completion<T>
): completion is Success<T> => {
  return completion.status === "success";
};

export const isFailure = <T>(
  completion: Completion<T>
): completion is Failure => {
  return completion.status === "failure";
};

export const toCompletion = async <T>(
  callback: () => T | Promise<T>
): Promise<Completion<T>> => {
  try {
    const value = await callback();
    return Success(value);
  } catch (e) {
    return Failure(
      e instanceof Error
        ? { type: e.name, message: String(e) }
        : { type: "string", message: String(e) }
    );
  }
};
