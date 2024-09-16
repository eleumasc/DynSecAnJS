import { CompactLocation, validateCompactLocation } from "./location";

interface CompactLabel {
  id: number;
  type: string;
  location: CompactLocation;
  info: any;
}

function validateCompactLabel(value: unknown): value is CompactLabel {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    value.id >= 0 &&
    "type" in value &&
    typeof value.type === "string" &&
    value.type !== "" &&
    validateCompactLocation("location" in value && value.location) &&
    "info" in value
  );
}

export { CompactLabel, validateCompactLabel };
