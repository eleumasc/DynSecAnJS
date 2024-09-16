import { Flow } from "./Flow";
import {
  expandTrackingResult,
  isCookieSourceLabel,
  isStorageSourceLabel,
} from "./yuantijs-core";

export const getJalangiTTFlows = (rawFlows: any): Flow[] => {
  const trackingResult = expandTrackingResult(rawFlows);

  return trackingResult.flowCollection.flatMap((rawFlow): Flow[] => {
    const { taint, sinkLabel } = rawFlow;

    if (!isNetworkSinkType(sinkLabel.type)) {
      return [];
    }

    const sink: Flow["sink"] = {
      type: "network",
      targetUrl: sinkLabel.info.url,
    };

    return taint
      .flatMap((label): Flow["source"][] => {
        if (isCookieSourceLabel(label)) {
          return [{ type: "cookie" }];
        } else if (
          isStorageSourceLabel(label) &&
          label.type === "localStorage.getItem"
        ) {
          return [{ type: "localStorage", key: label.info.key }];
        } else {
          return [];
        }
      })
      .map((source): Flow => {
        return { source, sink };
      });
  });
};

const isNetworkSinkType = (type: string): boolean => {
  switch (type) {
    case "XMLHttpRequest_2":
    case "fetch_2":
      return true;
    default:
      return false;
  }
};
