import _ from "lodash";
import assert from "assert";
import { getJalangiTTFlows } from "./getJalangiTTFlows";
import { getProjectFoxhoundFlows } from "./getProjectFoxhoundFlows";
import { ToolName } from "../../collection/ToolName";

export interface QuasiFlow {
  source: { type: "cookie" } | { type: "localStorage"; key: string };
  sink: { type: "network"; targetUrl: string };
  isExplicit: boolean;
}

export interface Flow extends QuasiFlow {
  site: string;
}

export const getToolQuasiFlows = (
  toolName: ToolName,
  rawFlows: any
): QuasiFlow[] => {
  if (!rawFlows) return [];

  let flows: QuasiFlow[];
  switch (toolName) {
    case "IF-Transpiler":
    case "LinvailTaint":
      flows = getEmptyFlows(rawFlows);
      break;
    case "JalangiTT":
      flows = getJalangiTTFlows(rawFlows);
      break;
    case "ProjectFoxhound":
      flows = getProjectFoxhoundFlows(rawFlows);
      break;
    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }

  return flows.map(simplifyFlow);
};

export const getEmptyFlows = (rawFlows: any): QuasiFlow[] => {
  assert(Array.isArray(rawFlows) && rawFlows.length === 0);
  return [];
};

export const uniqFlow = (flows: QuasiFlow[]) => _.uniqWith(flows, _.isEqual);

export const simplifyFlow = (flow: QuasiFlow): QuasiFlow => {
  const simplifyTargetUrl = (url: string): string => {
    if (url.startsWith("//")) url = `https:${url}`;
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return url;
    }
  };

  const {
    source,
    sink: { targetUrl },
    isExplicit,
  } = flow;

  return {
    source,
    sink: {
      type: "network",
      targetUrl: simplifyTargetUrl(targetUrl),
    },
    isExplicit,
  };
};
