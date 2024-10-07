import assert from "assert";
import path from "path";
import WPRArchive from "../../wprarchive/WPRArchive";
import { DetailedFlow, getSimplifiedFlows } from "./DetailedFlow";
import { Flow, uniqFlow } from "./Flow";
import { isSuccess } from "../../util/Completion";
import { lcsString } from "../../util/lcsString";
import { RecordArchive, StorageState } from "../../archive/RecordArchive";
import { setMeta } from "../../util/meta";
import { SiteSyntaxEntry } from "../SiteSyntaxEntry";

export const getMatchingFlows = (
  siteSyntaxEntries: SiteSyntaxEntry[],
  recordArchive: RecordArchive
): Flow[] => {
  return siteSyntaxEntries
    .filter(({ syntax }) => syntax.scripts.length > 0)
    .flatMap(({ site }) => {
      const siteResult = recordArchive.readSiteResult(site);
      assert(isSuccess(siteResult));
      const { value: recordReport } = siteResult;
      const { storageState } = recordReport;
      const wprArchive = WPRArchive.fromFile(
        path.join(recordArchive.archivePath, `${site}-archive.wprgo`)
      );

      return getSiteMatchingFlows(site, storageState, wprArchive);
    });
};

const getSiteMatchingFlows = (
  site: string,
  storageState: StorageState,
  wprArchive: WPRArchive
): Flow[] => {
  const cookieDetailedFlows = storageState.cookies
    .map((cookie) => cookie.value)
    .flatMap((value) =>
      wprArchive.requests
        .map((request) => request.url)
        .flatMap((url): DetailedFlow[] => {
          const match = matchValueAndUrl(value, url);
          if (match !== undefined) {
            return [
              setMeta(
                {
                  source: { type: "cookie" },
                  sink: { type: "network", targetUrl: url.toString() },
                  isExplicit: true,
                },
                { match }
              ),
            ];
          } else {
            return [];
          }
        })
    );

  const localStorageDetailedFlows = storageState.origins
    .flatMap((origin) => origin.localStorage)
    .flatMap((storageItem) =>
      wprArchive.requests
        .map((request) => request.url)
        .flatMap((url): DetailedFlow[] => {
          const match = matchValueAndUrl(storageItem.value, url);
          if (match !== undefined) {
            return [
              setMeta(
                {
                  source: { type: "localStorage", key: storageItem.name },
                  sink: { type: "network", targetUrl: url.toString() },
                  isExplicit: true,
                },
                { match }
              ),
            ];
          } else {
            return [];
          }
        })
    );

  const detailedFlows = [...cookieDetailedFlows, ...localStorageDetailedFlows];

  return uniqFlow(getSimplifiedFlows(detailedFlows, site));
};

const matchValueAndUrl = (value: string, url: URL): string | undefined => {
  const THRESHOLD = 8;
  const MAX_LIMIT = 5 * 1024;

  const subValue = stripUnixTimestamps(value);
  const subUrl = extractUrlPath(url);

  if (
    subValue.length >= THRESHOLD &&
    subUrl.length >= THRESHOLD &&
    subValue.length <= MAX_LIMIT
  ) {
    const match = lcsString(subValue, subUrl);
    if (match && match.str.length >= THRESHOLD) {
      return match.str;
    }
  }
  return undefined;
};

const stripUnixTimestamps = (value: string): string =>
  value.replace(/1[0-9]{12}/g, "");

const extractUrlPath = (url: URL): string => url.pathname + url.search;
