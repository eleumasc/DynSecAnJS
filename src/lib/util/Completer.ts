export default class Completer<T> {
  readonly promise: Promise<T>;
  readonly complete: (value: T) => void;
  readonly completeError: (reason?: any) => void;

  constructor() {
    let complete: ((value: T) => void) | null = null;
    let completeError: ((reason?: any) => void) | null = null;
    this.promise = new Promise((resolve, reject) => {
      complete = (value) => {
        resolve(value);
      };
      completeError = (reason) => {
        reject(reason);
      };
    });
    this.complete = complete!;
    this.completeError = completeError!;
  }
}
