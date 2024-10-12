import assert from "assert";
import { DetailedFlow } from "./DetailedFlow";

export const getPanoptiChromeFlows = (rawFlows: any): DetailedFlow[] => {
  assert(typeof rawFlows === "string");

  let flows: DetailedFlow[] = [];
  let currentOrigin;
  for (const match of rawFlows.matchAll(
    /^(ORIGIN)@("[^"]*")$|^(SINKPC)\$\{Window\}:("fetch"):("[^"]+")(?:\{.*\})?\n^(LEAK)\$[0-9]+:\{Window\}:("fetch"):(.*)$/gm
  )) {
    try {
      if (match[1]) {
        // Set origin
        currentOrigin = parseData(match[2]);
      } else {
        // Build flow
        assert(match[3]);
        assert(typeof currentOrigin === "string");
        const targetUrl = new URL(
          parseData(match[5]),
          currentOrigin
        ).toString();
        const sources = match[8].split(",");

        if (sources.includes("Document.cookie")) {
          flows = [
            ...flows,
            {
              sink: { type: "network", targetUrl },
              source: { type: "cookie" },
            },
          ];
        }

        if (
          sources.includes("Storage.getItem") &&
          sources.includes("Window.localStorage")
        ) {
          flows = [
            ...flows,
            {
              sink: { type: "network", targetUrl },
              source: { type: "localStorage" },
            },
          ];
        }
      }
    } catch {}
  }

  return flows;
};

const parseData = (data: string): string => {
  try {
    return JSON.parse(data.replace("\\:", ":"));
  } catch (e) {
    console.error(`Cannot parse: ${data}`);
    throw e;
  }
};
