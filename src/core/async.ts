export const delay = (timeoutMs: number): Promise<void> => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeoutMs);
  });
};

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = TimeoutError.name;
  }
}

export const timeBomb = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Promise timed out after ${timeoutMs} ms`));
      }, timeoutMs);

      const clearAndReject = (error: any) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      promise.then(clearAndReject, clearAndReject);
    }),
  ]);
};
