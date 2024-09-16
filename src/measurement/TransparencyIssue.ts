export enum JSError {
  ReferenceError = "ReferenceError",
  SyntaxError = "SyntaxError",
  TypeError = "TypeError",
  OtherError = "OtherError",
}

export const StandardJSErrors = [
  JSError.ReferenceError,
  JSError.SyntaxError,
  JSError.TypeError,
];

export const classifyJSErrors = (messages: string[]): JSError[] => {
  const resultSet = new Set<JSError>();

  for (const message of messages) {
    resultSet.add(
      StandardJSErrors.find((error) => message.includes(error)) ??
        JSError.OtherError
    );
  }

  return [...resultSet];
};
