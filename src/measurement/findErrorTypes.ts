export const knownErrorTypes = [
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Script error.",
];

export const findErrorTypes = (strings: string[]): Set<string> => {
  if (strings.length === 0) {
    return new Set();
  }

  const result = new Set<string>();

  for (const str of strings) {
    let errorFound = false;
    for (const error of knownErrorTypes) {
      if (str.includes(error)) {
        result.add(error);
        errorFound = true;
      }
    }
    if (!errorFound) {
      result.add("other");
    }
  }

  return result;
};
