export default class ToolError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = ToolError.name;
  }
}
