import assert from "assert";
import { CompactLabel } from "./compact-label";
import { Location, expandLocation } from "./location";

interface Label {
  id: number;
  type: string;
  location: Location;
  info: any;
}

function expandLabel<CompactInfo extends any, Info>(
  compact: CompactLabel,
  validateCompactInfo: (compact: any) => compact is CompactInfo,
  expandInfo: (compact: CompactInfo) => Info
): Label {
  assert(validateCompactInfo(compact.info), `Invalid info: ${JSON.stringify(compact.info)}`);
  return {
    id: compact.id,
    type: compact.type,
    location: expandLocation(compact.location),
    info: expandInfo(compact.info),
  };
}

export { Label, expandLabel };
