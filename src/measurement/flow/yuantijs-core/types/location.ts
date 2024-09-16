import { validateArrayOf } from "./helpers";

type LocArray = [number, number, number, number];

function validateLocArray(value: unknown): value is LocArray {
  return (
    validateArrayOf<number>(
      value,
      (element): element is number =>
        typeof element === "number" && element >= 0
    ) && value.length >= 4
  );
}

export { LocArray, validateLocArray };

interface CompactLocation {
  sid: number;
  iid: number;
  url: string;
  loc: LocArray;
  sub: CompactLocation | null;
}

function validateCompactLocation(value: unknown): value is CompactLocation {
  return (
    typeof value === "object" &&
    value !== null &&
    "sid" in value &&
    typeof value.sid === "number" &&
    value.sid >= 0 &&
    "iid" in value &&
    typeof value.iid === "number" &&
    value.iid >= 0 &&
    "url" in value &&
    typeof value.url === "string" &&
    "loc" in value &&
    validateLocArray(value.loc) &&
    "sub" in value &&
    (value.sub !== null ? validateCompactLocation(value.sub) : true)
  );
}

export { CompactLocation, validateCompactLocation };

interface Location {
  sid: number;
  iid: number;
  url: string;
  loc: LocArray;
}

function expandLocation(compact: CompactLocation): Location {
  if (compact.sub) {
    return expandLocation(compact.sub);
  }
  return {
    sid: compact.sid,
    iid: compact.iid,
    url: compact.url,
    loc: compact.loc,
  };
}

export { Location, expandLocation };
