import { Worker, isMainThread, parentPort } from "worker_threads";

import { Agent } from "port_agent";
import ArchiveWriter from "../lib/ArchiveWriter";
import assert from "assert";
import { chromium } from "playwright";
import { eachLimit } from "async";
import path from "path";
import { readSitelistFromFile } from "../core/sitelist";
import { unixTime } from "../util/time";
import { useForwardProxy } from "../util/ForwardProxy";
import { useWebPageReplay } from "../tools/WebPageReplay";

export interface CollectBrowserArgs {
  sitelistPath: string;
  browserName: string;
  concurrencyLimit: number;
}

export type BrowserName = "Chromium" | "Firefox";

export const isBrowserName = (value: any): value is BrowserName => {
  switch (value) {
    case "Chromium":
    case "Firefox":
      return true;
    default:
      return false;
  }
};

export interface BrowserLogfile {
  type: "BrowserLogfile";
  creationTime: number;
  browserName: BrowserName;
  sites: string[];
  processedSites: string[];
}

export const cmdCollectBrowser = async (args: CollectBrowserArgs) => {
  // const { browserName, sitelistPath, concurrencyLimit } = args;

  // assert(isBrowserName(browserName));

  // const sites = readSitelistFromFile(sitelistPath);
  // console.log(sites);
  // console.log(`${sites.length} sites`);

  // const creationTime = unixTime();
  // const outputPath = path.resolve(
  //   "results",
  //   `${creationTime}-browser-${browserName}`
  // );
  // console.log(`Output path: ${outputPath}`);

  // const archive = new ArchiveWriter(outputPath);

  // let logfile: BrowserLogfile = {
  //   type: "BrowserLogfile",
  //   creationTime,
  //   browserName,
  //   sites,
  //   processedSites: [],
  // };

  // const log = (msg: string) => {
  //   console.log(
  //     `[${logfile.processedSites.length} / ${logfile.sites.length}] ${msg}`
  //   );
  // };

  // await eachLimit(sites, concurrencyLimit, async (site) => {
  //   log(`begin analysis ${site}`);

  //   const worker = new Worker(__filename);
  //   try {
  //     const agent = new Agent(worker);
  //     agent.call(processSite.name, {
  //       site,
  //       outputPath,
  //     } satisfies ProcessSiteArgs);

  //     // archive.writeLogfile()
  //   } finally {
  //     worker.terminate();
  //   }

  //   log(`end analysis ${site}`);
  // });

  // console.log("done");
};

// interface ProcessSiteArgs {
//   browserName: BrowserName;
//   site: string;
//   outputPath: string;
// }

// interface ProcessSiteResult {}

// const processSite = async (
//   args: ProcessSiteArgs
// ): Promise<ProcessSiteResult> => {
//   const { browserName, site, outputPath } = args;

//   const archivePath = path.join(outputPath, `${site}-archive.wprgo`);

//   await useWebPageReplay(
//     {
//       operation: "record",
//       archivePath,
//     },
//     (wpr) =>
//       useForwardProxy(wpr, async (forwardProxy) => {
//         const browser = await chromium.launch({
//           headless: false,
//           proxy: { server: `${forwardProxy.hostname}:${forwardProxy.port}` },
//         });

//         const browserContext = await browser.newContext({
//           ignoreHTTPSErrors: true,
//         });

//         const page = await browserContext.newPage();

//         await page.goto(`http://${site}`);

//         await browser.close();
//       })
//   );
// };

// if (isMainThread) {
// } else {
//   assert(parentPort !== null);
//   const agent = new Agent(parentPort);
//   agent.register(processSite.name, processSite);
// }
