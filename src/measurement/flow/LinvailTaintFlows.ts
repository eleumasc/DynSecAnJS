import assert from "assert";
import { DetailedFlow } from "./DetailedFlow";

export const getLinvailTaintFlows = (rawFlows: any): DetailedFlow[] => {
  return (rawFlows as TaintReport[]).flatMap((taintReport): DetailedFlow[] => {
    const { name: sinkType, taint } = taintReport;

    if (!isNetworkSinkType(sinkType)) {
      return [];
    }

    const sink: DetailedFlow["sink"] = {
      type: "network",
      targetUrl: getTargetUrl(taintReport),
    };

    return taint
      .flatMap((taintElement): DetailedFlow["source"][] => {
        const { name: sourceType, argument } = taintElement;
        if (sourceType === "document.cookie") {
          return [{ type: "cookie" }];
        } else if (sourceType === "localStorage.getItem") {
          assert(typeof argument === "string");
          return [{ type: "localStorage", key: argument }];
        } else {
          return [];
        }
      })
      .map((source): DetailedFlow => {
        return { source, sink, isExplicit: true };
      });
  });
};

interface TaintReport {
  name: string;
  argument?: string;
  str: string;
  taint: TaintElement[];
}

interface TaintElement {
  name: string;
  argument?: string;
}

const isNetworkSinkType = (type: string): boolean => {
  switch (type) {
    case "XMLHttpRequest.prototype.open":
    case "XMLHttpRequest.prototype.send":
    case "fetch.url":
    case "fetch.body":
      return true;
    default:
      return false;
  }
};

const getTargetUrl = (taintReport: TaintReport): string => {
  const { name: sinkType, argument } = taintReport;

  switch (sinkType) {
    case "XMLHttpRequest.prototype.open":
    case "XMLHttpRequest.prototype.send":
    case "fetch.url":
    case "fetch.body":
      assert(typeof argument === "string");
      return argument;
    default:
      throw new Error(`Unknown NetworkSinkType: ${sinkType}`); // This should never happen
  }
};
