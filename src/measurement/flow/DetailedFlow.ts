import { Flow } from "./Flow";
import { propagateMeta } from "../../util/meta";

export interface DetailedFlow {
  source: { type: "cookie" } | { type: "localStorage"; key: string };
  sink: { type: "network"; targetUrl: string };
  isExplicit: boolean;
}

export const simplifyFlow = (
  detailedFlow: DetailedFlow,
  site: string
): Flow => {
  const simplifyTargetUrl = (url: string): string => {
    if (url.startsWith("//")) url = `https:${url}`; // TODO: remove after related fixes
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  };

  const {
    sink: { targetUrl },
    ...rest
  } = detailedFlow;

  return propagateMeta(
    {
      ...rest,
      sink: {
        type: "network",
        targetDomain: simplifyTargetUrl(targetUrl),
      },
      site,
    },
    detailedFlow
  );
};

export const getSimplifiedFlows = (
  detailedFlows: DetailedFlow[],
  site: string
): Flow[] =>
  detailedFlows.flatMap((detailedFlow) => {
    try {
      return [simplifyFlow(detailedFlow, site)];
    } catch {
      return [];
    }
  });
