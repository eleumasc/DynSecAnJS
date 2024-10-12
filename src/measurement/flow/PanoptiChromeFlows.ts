import assert from "assert";
import { DetailedFlow } from "./DetailedFlow";

export const getPanoptiChromeFlows = (rawFlows: any): DetailedFlow[] => {
  assert(typeof rawFlows === "string");

  let flows: DetailedFlow[] = [];
  for (const match of rawFlows.matchAll(
    /^(ORIGIN)@("[^"]*")$|^(SINKPC)\$\{Window\}:("fetch"):("[^"]+")(?:\{.*\})?\n^(LEAK)\$[0-9]+:\{Window\}:("fetch"):(.*)$/gm
  )) {
    let origin;
    if (match[1]) {
      // Set origin
      origin = JSON.parse(match[2]);
    } else {
      // Build flow
      assert(match[3]);
      assert(typeof origin === "string");
      const targetUrl = new URL(JSON.parse(match[5]), origin).toString();
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
  }

  return flows;
};
