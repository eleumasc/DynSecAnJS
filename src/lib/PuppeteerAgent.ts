import {
  Mockttp as MockttpServer,
  generateSPKIFingerprint,
  getLocal,
} from "mockttp";
import puppeteer, {
  Browser,
  Page,
  PuppeteerLaunchOptions,
  TimeoutError,
} from "puppeteer";
import { ExecutionDetail } from "./ExecutionAnalysis";
import { timeBomb } from "./util/async";
import { useBrowserContext, usePage } from "./util/browser";
import { defaultAnalysisDelayMs, defaultAnalysisTimeoutMs } from "./defaults";
import { Agent, RunOptions } from "./Agent";
import CertificationAuthority from "./CertificationAuthority";
import { Fallible } from "./util/Fallible";
import { DataAttachment } from "./Archive";
import Deferred from "./util/Deferred";
import { MonitorReport } from "./monitor";
import { randomUUID } from "crypto";
import { ContentType } from "./AnalysisProxy";
import FeatureSet from "./FeatureSet";
import { useMonitorViaAnalysisProxy } from "./useMonitorViaAnalysisProxy";

const X_REQUEST_ID = "x-dynsecanjs-request-id";

export interface Options {
  pptrLaunchOptions?: PuppeteerLaunchOptions;
  certificationAuthority: CertificationAuthority;
  transform?: Transformer;
}

export type Transformer = (
  content: string,
  contentType: ContentType
) => Promise<string>;

export class PuppeteerAgent implements Agent {
  constructor(
    readonly browser: Browser,
    readonly mockttpServer: MockttpServer,
    readonly options: Options
  ) {}

  async run(runOptions: RunOptions): Promise<Fallible<ExecutionDetail>> {
    const { certificationAuthority, transform } = this.options;
    const { url, wprArchivePath, wprOperation, attachmentList } = runOptions;

    const willCompleteAnalysis = new Deferred<ExecutionDetail>();

    const topNavigationRequestIds = new Set<string>();
    const runPage = async (page: Page): Promise<ExecutionDetail> => {
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const requestId = randomUUID();
        if (
          request.resourceType() === "document" &&
          request.frame() === page.mainFrame()
        ) {
          topNavigationRequestIds.add(requestId);
        }
        request.continue({
          headers: {
            ...request.headers(),
            [X_REQUEST_ID]: requestId,
          },
        });
      });

      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: defaultAnalysisTimeoutMs,
        });
      } catch (e) {
        if (!(e instanceof TimeoutError)) {
          throw e;
        }
      }

      const result = await timeBomb(
        willCompleteAnalysis.promise,
        defaultAnalysisDelayMs
      );

      if (attachmentList) {
        attachmentList.add(
          "screenshot.png",
          new DataAttachment(await page.screenshot())
        );
      }

      return result;
    };

    try {
      const targetSites = new Set<string>();
      const includedScriptUrls = new Set<string>();
      const startTime = Date.now();

      return await useMonitorViaAnalysisProxy(
        {
          mockttpServer: this.mockttpServer,
          reportCallback: (monitorReport: MonitorReport) => {
            const {
              pageUrl,
              uncaughtErrors,
              consoleMessages,
              calledBuiltinMethods,
              cookieKeys,
              localStorageKeys,
              sessionStorageKeys,
              loadingCompleted,
            } = monitorReport;
            willCompleteAnalysis.resolve({
              pageUrl,
              featureSet: new FeatureSet(
                new Set(uncaughtErrors),
                new Set(consoleMessages),
                new Set(calledBuiltinMethods),
                new Set(cookieKeys),
                new Set(localStorageKeys),
                new Set(sessionStorageKeys),
                new Set(targetSites),
                new Set(includedScriptUrls)
              ),
              loadingCompleted,
              executionTimeMs: Date.now() - startTime,
            });
          },
          requestListener: (req) => {
            targetSites.add(req.url.hostname);
          },
          responseTransformer: async (res) => {
            const { contentType, body, req } = res;
            if (contentType === "javascript") {
              includedScriptUrls.add(req.url.href);
            }
            return transform ? transform(body, contentType) : body;
          },
          dnsLookupErrorListener: (err, req) => {
            const requestId = req.headers[X_REQUEST_ID];
            if (requestId && topNavigationRequestIds.has(requestId as string)) {
              willCompleteAnalysis.reject(err);
            }
          },
          wprOptions: {
            operation: wprOperation ?? "replay",
            archivePath: wprArchivePath,
            certificationAuthority,
          },
          loadingTimeoutMs: defaultAnalysisTimeoutMs, // TODO: abstract into "monitorCommand", same for reportCallback, requestListener, and responseTransformer
        },
        async (analysisProxy) =>
          useBrowserContext(
            this.browser,
            { proxyServer: `127.0.0.1:${analysisProxy.getPort()}` },
            (browserContext) =>
              usePage(browserContext, async (page) => {
                const executionDetail = await runPage(page);
                return {
                  status: "success",
                  val: executionDetail,
                };
              })
          )
      );
    } catch (e) {
      return {
        status: "failure",
        reason: String(e),
      };
    }
  }

  async terminate(): Promise<void> {
    await this.browser.close();
  }

  static async create(options: Options): Promise<PuppeteerAgent> {
    const { pptrLaunchOptions, certificationAuthority } = options;
    const mockttpServer = getLocal({
      https: {
        cert: certificationAuthority.getCertificate(),
        key: certificationAuthority.getKey(),
      },
      recordTraffic: false,
    });

    const browser = await puppeteer.launch({
      ...pptrLaunchOptions,
      args: [
        ...(pptrLaunchOptions?.args ?? []),
        `--proxy-server=per-context`,
        `--ignore-certificate-errors-spki-list=${generateSPKIFingerprint(
          certificationAuthority.getCertificate()
        )}`,
      ],
    });

    return new PuppeteerAgent(browser, mockttpServer, options);
  }
}
