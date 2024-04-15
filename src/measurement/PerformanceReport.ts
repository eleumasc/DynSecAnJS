import { SiteInfo } from "./SiteInfo";
import { avg } from "../core/math";
import { intersectSets } from "../core/Set";

export interface PerformanceReport {
  benchmarkSites: string[];
  avgOverheads: number[];
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
        const performance =
          compatibility?.predominantTraceExistance?.transparency?.performance;
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

  const avgOverheads = performanceInfoEntryLists.map((entryList) =>
    avg(
      entryList
        .filter(({ site }) => benchmarkSites.includes(site))
        .map(
          ({ performance }) =>
            performance.toolExecutionTimeMs /
            performance.originalExecutionTimeMs
        )
    )
  );

  return {
    benchmarkSites,
    avgOverheads,
  };
};
