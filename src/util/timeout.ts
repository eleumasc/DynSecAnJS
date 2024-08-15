export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const timeBomb = async <T>(
  promise: Promise<T>,
  ms: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Promise timed out after ${ms} ms`));
      }, ms);

      promise.then(
        () => {
          clearTimeout(timeoutId);
        },
        (err) => {
          clearTimeout(timeoutId);
          reject(err);
        }
      );
    }),
  ]);
};

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = TimeoutError.name;
  }
}
