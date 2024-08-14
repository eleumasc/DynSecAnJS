import { Completion, isSuccess } from "./Completion";

export const retryOnce = async <T>(
  callback: () => Promise<Completion<T>>
): Promise<Completion<T>> => {
  const firstTry = await callback();
  if (isSuccess(firstTry)) {
    return firstTry;
  }
  return await callback();
};
