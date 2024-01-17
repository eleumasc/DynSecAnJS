export const asyncDelay = (timeoutMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeoutMs);
  });
};

export const timeBomb = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Promise timed out after ${timeoutMs} ms`));
      }, timeoutMs);

      const clearAndReject = (error: any) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      promise.then(clearAndReject, clearAndReject);
    }),
  ]);
};
