import { DetailedFlow, getSimplifiedFlows } from "./DetailedFlow";
import { Flow, uniqFlow } from "./Flow";
import { getEmptyFlows } from "./EmptyFlows";
import { getJalangiTTFlows } from "./JalangiTTFlows";
import { getLinvailTaintFlows } from "./LinvailTaintFlows";
import { getPanoptiChromeFlows } from "./PanoptiChromeFlows";
import { getProjectFoxhoundFlows } from "./ProjectFoxhoundFlows";
import { ToolName } from "../../collection/ToolName";

export const getToolFlows = (
  site: string,
  toolName: ToolName,
  rawFlows: any
): Flow[] => {
  if (!rawFlows) return [];

  const detailedFlows = getToolDetailedFlows(toolName, rawFlows);

  return uniqFlow(getSimplifiedFlows(detailedFlows, site));
};

const getToolDetailedFlows = (
  toolName: ToolName,
  rawFlows: any
): DetailedFlow[] => {
  switch (toolName) {
    case "IF-Transpiler":
      return getEmptyFlows(rawFlows);
    case "LinvailTaint":
      return getLinvailTaintFlows(rawFlows);
    case "JalangiTT":
      return getJalangiTTFlows(rawFlows);
    case "ProjectFoxhound":
      return getProjectFoxhoundFlows(rawFlows);
    case "PanoptiChrome":
      return getPanoptiChromeFlows(rawFlows);
    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
};
