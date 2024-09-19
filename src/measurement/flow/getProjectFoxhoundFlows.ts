import { QuasiFlow } from "./Flow";

export const getProjectFoxhoundFlows = (rawFlows: any): QuasiFlow[] => {
  return (rawFlows as TaintReport[]).flatMap((taintReport): QuasiFlow[] => {
    const { sink: sinkType, taint } = taintReport;

    if (!isNetworkSinkType(sinkType)) {
      return [];
    }

    const sink: QuasiFlow["sink"] = {
      type: "network",
      targetUrl: getTargetUrl(taintReport),
    };

    return taint
      .flatMap((taintElement): QuasiFlow["source"][] => {
        const { flow } = taintElement;
        const sourceFlowElement = flow[flow.length - 1];
        const { operation: sourceType, arguments: sourceArguments } =
          sourceFlowElement;
        if (sourceType === "document.cookie") {
          return [{ type: "cookie" }];
        } else if (sourceType === "localStorage.getItem") {
          return [{ type: "localStorage", key: sourceArguments[0] }];
        } else {
          return [];
        }
      })
      .map((source): QuasiFlow => {
        return { source, sink, isExplicit: true };
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

const getTargetUrl = (taintReport: TaintReport): string => {
  const { sink: sinkType, str, taint } = taintReport;
  const sinkFlowElement = taint[0].flow[1];
  const { arguments: sinkArguments } = sinkFlowElement;

  switch (sinkType) {
    case "XMLHttpRequest.open(url)":
    case "fetch.url":
      return str;
    case "XMLHttpRequest.send":
    case "fetch.body":
      return sinkArguments[0];
    default:
      throw new Error(`Unknown NetworkSinkType: ${sinkType}`); // This should never happen
  }
};
