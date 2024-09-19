import { QuasiFlow } from "./Flow";
import {
  expandTrackingResult,
  isCookieSourceLabel,
  isStorageSourceLabel,
} from "./yuantijs-core";

export const getJalangiTTFlows = (rawFlows: any): QuasiFlow[] => {
  const trackingResult = expandTrackingResult(rawFlows);

  return trackingResult.flowCollection.flatMap((rawFlow): QuasiFlow[] => {
    const { taint, sinkLabel } = rawFlow;

    if (!isNetworkSinkType(sinkLabel.type)) {
      return [];
    }

    const sink: QuasiFlow["sink"] = {
      type: "network",
      targetUrl: sinkLabel.info.url,
    };

    return taint
      .flatMap((label): QuasiFlow["source"][] => {
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
      .map((source): QuasiFlow => {
        return { source, sink, isExplicit: true };
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
