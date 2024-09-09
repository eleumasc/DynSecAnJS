export default class TranspileError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = TranspileError.name;
  }
}
