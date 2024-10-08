export const delay = (timeoutMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
};

export const timeBomb = async <T>(
  callback: () => Promise<T>,
  timeoutMs: number
): Promise<T> => {
  let promise: Promise<void>;

  return Promise.race([
    new Promise<T>((res, rej) => {
      promise = callback().then(res, rej);
    }),
    new Promise<T>((_, rej) => {
      const timeoutId = setTimeout(() => {
        rej(new TimeoutError(`Promise timed out after ${timeoutMs} ms`));
      }, timeoutMs);

      promise!.finally(() => {
        clearTimeout(timeoutId);
      });
    }),
  ]);
};

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = TimeoutError.name;
  }
}
