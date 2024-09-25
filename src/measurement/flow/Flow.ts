import _ from "lodash";
import { getJalangiTTFlows } from "./getJalangiTTFlows";
import { getProjectFoxhoundFlows } from "./getProjectFoxhoundFlows";
import { ToolName } from "../../collection/ToolName";

export interface FlowWithoutSite {
  source: { type: "cookie" } | { type: "localStorage"; key: string };
  sink: { type: "network"; targetUrl: string };
  isExplicit: boolean;
}

export interface Flow extends FlowWithoutSite {
  site: string;
}

export const getToolFlows = (
  site: string,
  toolName: ToolName,
  rawFlows: any
): Flow[] => {
  if (!rawFlows) return [];

  let flows: FlowWithoutSite[];
  switch (toolName) {
    case "IF-Transpiler":
    case "LinvailTaint":
      flows = getEmptyFlows(rawFlows); // TODO: get flows detected by LinvailTaint
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

  return flows
    .map(simplifyFlow)
    .map((flowWithoutSite) => ({ ...flowWithoutSite, site }));
};

export const getEmptyFlows = (rawFlows: any): FlowWithoutSite[] => {
  // assert(Array.isArray(rawFlows) && rawFlows.length === 0); // TODO: uncomment
  return [];
};

export const uniqFlow = (flows: Flow[]) => _.uniqWith(flows, _.isEqual);

export const simplifyFlow = (flow: FlowWithoutSite): FlowWithoutSite => {
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
