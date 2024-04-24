import { avg, stdev } from "../core/math";

import { SiteInfo } from "./SiteInfo";
import assert from "assert";
import { intersectSets } from "../core/Set";

export interface PerformanceReport {
  benchmarkSites: string[];
  details: PerformanceDetail[];
}

export interface PerformanceDetail {
  originalAvg: number;
  originalStdev: number;
  toolAvg: number;
  toolStdev: number;
  overhead: number;
}

export const getPerformanceReport = (
  siteInfoLists: SiteInfo[][]
): PerformanceReport => {
  const performanceInfoEntryLists = siteInfoLists.map((siteInfoList) =>
    siteInfoList
      .map((siteInfo) => {
        const compatibility = siteInfo?.compatibility;
        if (!compatibility) {
          return null;
        }
        if (!compatibility.syntacticallyCompatible) {
          return null;
        }
        const performance = compatibility?.transparency?.performance;
        if (!performance) {
          return null;
        }
        return {
          site: siteInfo.site,
          performance,
        };
      })
      .filter(<T>(x: T | null): x is T => x !== null)
  );

  const benchmarkSites = [
    ...intersectSets(
      ...performanceInfoEntryLists.map(
        (entryList) => new Set(entryList.map(({ site }) => site))
      )
    ),
  ];

  const details = performanceInfoEntryLists.map(
    (entryList): PerformanceDetail => {
      const performanceInfoList = entryList
        .filter(({ site }) => benchmarkSites.includes(site))
        .map(({ performance }) => performance);

      const getRunExecutionTimes = (executionTimesList: number[][]): number[] =>
        executionTimesList.reduce((acc, cur) => {
          assert(cur.length === acc.length);
          return cur.map((value, index) => acc[index] + value);
        }, Array(5).fill(0));
      const originalRunExecutionTimes = getRunExecutionTimes(
        performanceInfoList.map((info) => info.originalExecutionTimes)
      );
      const toolRunExecutionTimes = getRunExecutionTimes(
        performanceInfoList.map((info) => info.toolExecutionTimes)
      );

      const originalAvg = avg(originalRunExecutionTimes);
      const originalStdev = stdev(originalRunExecutionTimes);
      const toolAvg = avg(toolRunExecutionTimes);
      const toolStdev = stdev(toolRunExecutionTimes);
      const overhead = toolAvg / originalAvg;

      return {
        originalAvg,
        originalStdev,
        toolAvg,
        toolStdev,
        overhead,
      };
    }
  );

  return {
    benchmarkSites,
    details,
  };
};
