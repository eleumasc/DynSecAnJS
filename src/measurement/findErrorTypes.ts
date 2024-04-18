export enum StandardErrorType {
  ReferenceError = "ReferenceError",
  SyntaxError = "SyntaxError",
  TypeError = "TypeError",
}

const StandardErrorType_VALUES = Object.values(StandardErrorType);

export const ErrorType = {
  ...StandardErrorType,
  OtherError: "OtherError",
};

export const findErrorTypes = (messages: string[]): Set<string> => {
  if (messages.length === 0) {
    return new Set();
  }

  const errorTypes = new Set<string>();

  for (const message of messages) {
    errorTypes.add(
      StandardErrorType_VALUES.find((error) => message.includes(error)) ??
        ErrorType.OtherError
    );
  }

  return errorTypes;
};
