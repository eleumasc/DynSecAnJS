import _ from "lodash";
import assert from "assert";
import { getJalangiTTFlows } from "./getJalangiTTFlows";
import { getProjectFoxhoundFlows } from "./getProjectFoxhoundFlows";
import { ToolName } from "../../collection/ToolName";

export interface Flow {
  source: { type: "cookie" } | { type: "localStorage"; key: string };
  sink: { type: "network"; targetUrl: string };
}

export const uniqFlow = (flows: Flow[]) => _.uniqWith(flows, _.isEqual);

export const getToolFlows = (toolName: ToolName, rawFlows: any): Flow[] => {
  if (!rawFlows) return [];

  switch (toolName) {
    case "IF-Transpiler":
    case "LinvailTaint":
      return getEmptyFlows(rawFlows);
    case "JalangiTT":
      return getJalangiTTFlows(rawFlows);
    case "ProjectFoxhound":
      return getProjectFoxhoundFlows(rawFlows);
    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
};

export const getEmptyFlows = (rawFlows: any): Flow[] => {
  assert(Array.isArray(rawFlows) && rawFlows.length === 0);
  return [];
};
