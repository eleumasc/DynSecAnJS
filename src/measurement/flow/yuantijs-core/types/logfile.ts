import assert from "assert";
import { CompactTrackingResult } from "./compact-logfile";
import { Label } from "./label";
import {
  StorageLabel,
  expandAnalysisLabel,
  isStorageLabel,
} from "./analysis-label";

interface Flow {
  taint: Label[];
  sinkLabel: Label;
}

export { Flow };

function flowLabels(flow: Flow): Label[] {
  return [...flow.taint, flow.sinkLabel];
}

export { flowLabels };

interface TrackingResult {
  flowCollection: Flow[];
}

function expandTrackingResult(compact: CompactTrackingResult): TrackingResult {
  const labelMap = new Map(
    Object.values(compact.labelMap).flatMap(
      (compactLabel): [number, Label][] => {
        try {
          return [[compactLabel.id, expandAnalysisLabel(compactLabel)]];
        } catch {
          return [];
        }
      }
    )
  );
  const tryGetLabelById = (labelId: number): Label => {
    const label = labelMap.get(labelId);
    assert(label !== undefined);
    return label;
  };
  const flowCollection: Flow[] = compact.flowCollection.flatMap(
    (compactFlow): Flow[] => {
      try {
        return [
          {
            taint: compactFlow.taint.map((labelId) => tryGetLabelById(labelId)),
            sinkLabel: tryGetLabelById(compactFlow.sinkLabel),
          },
        ];
      } catch {
        return [];
      }
    }
  );
  return { flowCollection };
}

export { TrackingResult, expandTrackingResult };
