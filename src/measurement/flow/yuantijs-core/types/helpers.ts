function validateArrayOf<T>(
  value: unknown,
  isT: (element: unknown) => element is T
): value is T[] {
  return (
    typeof value === "object" &&
    value !== null &&
    value instanceof Array &&
    value.every(isT)
  );
}

export { validateArrayOf as validateArrayOf };

function validateRecordOfString(
  value: unknown
): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.entries(value).every(
      ([key, val]) => typeof key === "string" && typeof val === "string"
    )
  );
}

export { validateRecordOfString };
