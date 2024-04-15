export enum StandardErrorType {
  EvalError = "EvalError",
  RangeError = "RangeError",
  ReferenceError = "ReferenceError",
  SyntaxError = "SyntaxError",
  TypeError = "TypeError",
  URIError = "URIError",
}

const StandardErrorType_VALUES = Object.values(StandardErrorType);

export const ErrorType = {
  ...StandardErrorType,
  UnknownError: "UnknownError",
};

export const findErrorTypes = (messages: string[]): Set<string> => {
  if (messages.length === 0) {
    return new Set();
  }

  const errorTypes = new Set<string>();

  for (const message of messages) {
    errorTypes.add(
      StandardErrorType_VALUES.find((error) => message.includes(error)) ??
        ErrorType.UnknownError
    );
  }

  return errorTypes;
};
