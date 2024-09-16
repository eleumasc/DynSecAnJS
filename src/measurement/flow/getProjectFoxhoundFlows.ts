import { Flow } from "./Flow";

export const getProjectFoxhoundFlows = (rawFlows: any): Flow[] => {
  return (rawFlows as TaintReport[]).flatMap((taintReport): Flow[] => {
    const { sink: sinkOperation, str, taint } = taintReport;

    if (!isNetworkSinkType(sinkOperation)) {
      return [];
    }

    const sink: Flow["sink"] = { type: "network", targetUrl: str };

    return taint
      .flatMap((taintElement): Flow["source"][] => {
        const { flow } = taintElement;
        const sourceFlowElement = flow[flow.length - 1];
        const { operation: sourceOperation, arguments: sourceArguments } =
          sourceFlowElement;
        if (sourceOperation === "document.cookie") {
          return [{ type: "cookie" }];
        } else if (sourceOperation === "localStorage.getItem") {
          return [{ type: "localStorage", key: sourceArguments[0] }];
        } else {
          return [];
        }
      })
      .map((source): Flow => {
        return { source, sink };
      });
  });
};

interface TaintReport {
  sink: string;
  str: string;
  taint: TaintElement[];
}

interface TaintElement {
  flow: FlowElement[];
}

interface FlowElement {
  arguments: string[];
  operation: string;
}

const isNetworkSinkType = (type: string): boolean => {
  switch (type) {
    case "XMLHttpRequest.open(url)":
    case "XMLHttpRequest.send":
    case "fetch.url":
    case "fetch.body":
      return true;
    default:
      return false;
  }
};
