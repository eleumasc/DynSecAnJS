import { Completion, isSuccess } from "./Completion";

export const retryOnce = async <T>(callback: () => Promise<T>): Promise<T> => {
  try {
    return await callback();
  } catch {
    return await callback();
  }
};

export const retryOnceCompletion = async <T>(
  callback: () => Promise<Completion<T>>
): Promise<Completion<T>> => {
  const firstTry = await callback();
  if (isSuccess(firstTry)) {
    return firstTry;
  }
  return await callback();
};
