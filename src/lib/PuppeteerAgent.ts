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
import { timeBomb } from "./util/async";
import { useBrowserContext, usePage } from "./util/browser";
import CertificationAuthority from "./CertificationAuthority";
import { Fallible } from "./util/Fallible";
import { DataAttachment } from "./ArchiveWriter";
import Deferred from "./util/Deferred";
import { randomUUID } from "crypto";
import { ContentType } from "./AnalysisProxy";
import { useProxiedMonitor } from "./useProxiedMonitor";
import { Agent, RunOptions } from "./Agent";
import { ProxyHooksProvider } from "./ProxyHooks";

const X_REQUEST_ID = "x-dynsecanjs-request-id";

export interface Options<T> {
  certificationAuthority: CertificationAuthority;
  proxyHooksProvider: ProxyHooksProvider<T>;
}

export type Transformer = (
  content: string,
  contentType: ContentType
) => Promise<string>;

export class PuppeteerAgent<T> implements Agent<T> {
  constructor(
    readonly browser: Browser,
    readonly mockttpServer: MockttpServer,
    readonly options: Options<T>
  ) {}

  async run(runOptions: RunOptions): Promise<Fallible<T>> {
    const { certificationAuthority, proxyHooksProvider } = this.options;
    const {
      url,
      wprOptions,
      timeSeedMs,
      loadingTimeoutMs,
      analysisDelayMs,
      attachmentList,
    } = runOptions;

    const willCompleteAnalysis = new Deferred<T>();

    const topNavigationRequestIds = new Set<string>();
    const runPage = async (page: Page): Promise<T> => {
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
          timeout: loadingTimeoutMs,
        });
      } catch (e) {
        if (!(e instanceof TimeoutError)) {
          throw e;
        }
      }

      const result = await timeBomb(
        willCompleteAnalysis.promise,
        analysisDelayMs
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
      const { reportCallback, requestListener, responseTransformer } =
        proxyHooksProvider(willCompleteAnalysis);

      return await useProxiedMonitor(
        {
          mockttpServer: this.mockttpServer,
          reportCallback,
          requestListener,
          responseTransformer,
          dnsLookupErrorListener: (err, req) => {
            const requestId = req.headers[X_REQUEST_ID];
            if (requestId && topNavigationRequestIds.has(requestId as string)) {
              willCompleteAnalysis.reject(err);
            }
          },
          wprOptions: {
            ...wprOptions,
            certificationAuthority,
          },
          timeSeedMs,
          loadingTimeoutMs,
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

  static async create<T>(
    pptrLaunchOptions: PuppeteerLaunchOptions | undefined,
    options: Options<T>
  ): Promise<PuppeteerAgent<T>> {
    const { certificationAuthority } = options;
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
