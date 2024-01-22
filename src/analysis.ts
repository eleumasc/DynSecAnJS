import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { DebugAnalysis } from "./lib/DebugAnalysis";
import { serializeLogfile } from "./lib/serialize";
import { AnalysisResult, Logfile } from "./lib/Analysis";
import { PuppeteerProxyAnalysis } from "./lib/PuppeteerProxyAnalysis";

const ANALYSIS_RUNS_PER_SITE = 6;

const main = async () => {
  const siteList = [
    "google.com",
    "amazonaws.com",
    "facebook.com",
    "microsoft.com",
    "a-msedge.net",
    "googleapis.com",
    "apple.com",
    "youtube.com",
    "akamaiedge.net",
    "akamai.net",
    "twitter.com",
    "instagram.com",
    "googlevideo.com",
    "azure.com",
    "gstatic.com",
    "cloudflare.com",
    "linkedin.com",
    "tiktokcdn.com",
    "live.com",
    "windowsupdate.com",
    "netflix.com",
    "office.com",
    "akadns.net",
    "doubleclick.net",
    "googletagmanager.com",
    "apple-dns.net",
    "amazon.com",
    "fbcdn.net",
    "trafficmanager.net",
    "microsoftonline.com",
    "wikipedia.org",
    "fastly.net",
    "bing.com",
    "icloud.com",
    "domaincontrol.com",
    "l-msedge.net",
    "googleusercontent.com",
    "wordpress.org",
    "root-servers.net",
    "youtu.be",
    "yahoo.com",
    "mail.ru",
    "aaplimg.com",
    "digicert.com",
    "gtld-servers.net",
    "pinterest.com",
    "github.com",
    "ui.com",
    "t-msedge.net",
    "tiktokv.com",
    "windows.net",
    "googlesyndication.com",
    "nflxso.net",
    "adobe.com",
    "sharepoint.com",
    "goo.gl",
    "cloudfront.net",
    "spotify.com",
    "vimeo.com",
    "wordpress.com",
    "gandi.net",
    "google-analytics.com",
    "zoom.us",
    "office.net",
    "bit.ly",
    "gvt2.com",
    "edgekey.net",
    "bytefcdn-oversea.com",
    "skype.com",
    "s-msedge.net",
    "msn.com",
    "whatsapp.net",
    "yandex.net",
    "qq.com",
    "office365.com",
    "mozilla.org",
    "cloudflare.net",
    "whatsapp.com",
    "ntp.org",
    "roblox.com",
    "app-measurement.com",
    "blogspot.com",
    "ytimg.com",
    "tiktok.com",
    "cloudflare-dns.com",
    "googledomains.com",
    "yandex.ru",
    "outlook.com",
    "wac-msedge.net",
    "trbcdn.net",
    "reddit.com",
    "snapchat.com",
    "intuit.com",
    "gvt1.com",
    "opera.com",
    "cdn77.org",
    "netflix.net",
    "tds.net",
    "pki.goog",
    "epicgames.com",
  ];
  const analysisId = (+new Date()).toString();

  // const analysis = await DebugAnalysis.create({
  //   headless: "new", // false
  //   defaultViewport: { width: 1280, height: 720 },
  // });
  const analysis = await PuppeteerProxyAnalysis.create({
    headless: false, // "new",
    defaultViewport: { width: 1280, height: 720 },
  });

  for (const [siteIndex, site] of Object.entries(siteList)) {
    console.log(`begin analysis ${site} [${siteIndex}]`);

    const url = `http://${site}/`;
    let analysisResults: AnalysisResult[] = [];
    for (let i = 0; i < ANALYSIS_RUNS_PER_SITE; i += 1) {
      const analysisResult = await analysis.run(url);

      analysisResults = [...analysisResults, analysisResult];

      if (analysisResult.status === "failure") {
        console.log(analysisResult.reason);
      }
    }

    const outDir = join("results", analysisId);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, `${site}.json`),
      JSON.stringify(
        serializeLogfile({
          site,
          analysisResults,
        } satisfies Logfile)
      )
    );

    console.log(`end analysis ${site}`);
  }

  await analysis.terminate();
};

main();
