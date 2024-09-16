import { CompactLabel, validateCompactLabel } from "./compact-label";
import { validateArrayOf } from "./helpers";

type LabelMap = { [key: number]: CompactLabel };

function validateLabelMap(value: unknown): value is LabelMap {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.entries(value).every(
      ([key, val]) => !isNaN(+key) && validateCompactLabel(val)
    )
  );
}

export { LabelMap, validateLabelMap };

type LabelMapKey = keyof LabelMap;

function validateLabelMapKey(value: unknown): value is LabelMapKey {
  return typeof value === "number" && value > 0;
}

export { LabelMapKey, validateLabelMapKey };

interface CompactFlow {
  taint: LabelMapKey[];
  sinkLabel: LabelMapKey;
}

function validateCompactFlow(value: unknown): value is CompactFlow {
  return (
    typeof value === "object" &&
    value !== null &&
    "taint" in value &&
    validateArrayOf<LabelMapKey>(value.taint, validateLabelMapKey) &&
    "sinkLabel" in value &&
    validateLabelMapKey(value.sinkLabel)
  );
}

export { CompactFlow, validateCompactFlow };

interface CompactTrackingResult {
  labelMap: LabelMap;
  flowCollection: CompactFlow[];
  storageLabelCollection: LabelMapKey[];
}

function validateCompactTrackingResult(
  value: unknown
): value is CompactTrackingResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "labelMap" in value &&
    validateLabelMap(value.labelMap) &&
    "flowCollection" in value &&
    validateArrayOf<CompactFlow>(value.flowCollection, validateCompactFlow) &&
    "storageLabelCollection" in value &&
    validateArrayOf<LabelMapKey>(
      value.storageLabelCollection,
      validateLabelMapKey
    )
  );
}

export { CompactTrackingResult, validateCompactTrackingResult };
