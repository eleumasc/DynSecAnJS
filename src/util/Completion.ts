interface BaseCompletion {
  status: "success" | "failure";
}

export interface Success<T> extends BaseCompletion {
  status: "success";
  value: T;
}

export interface Failure extends BaseCompletion {
  status: "failure";
  message: string;
}

export type Completion<T> = Success<T> | Failure;

export const Success = <T>(value: T): Success<T> => {
  return { status: "success", value };
};

export const Failure = (message: string): Failure => {
  return { status: "failure", message };
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
  cb: () => Promise<T>
): Promise<Completion<T>> => {
  try {
    const value = await cb();
    return {
      status: "success",
      value,
    };
  } catch (e) {
    return {
      status: "failure",
      message: String(e),
    };
  }
};
