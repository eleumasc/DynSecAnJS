import { generateSPKIFingerprint } from "mockttp";
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
import { useProxiedMonitor } from "./useProxiedMonitor";
import { Agent, RunOptions } from "./Agent";
import { ProxyHooksProvider } from "./ProxyHooks";

const X_REQUEST_ID = "x-dynsecanjs-request-id";

export interface Options<T> {
  certificationAuthority: CertificationAuthority;
  proxyHooksProvider: ProxyHooksProvider<T>;
}

export class PuppeteerAgent<T> implements Agent<T> {
  constructor(readonly browser: Browser, readonly options: Options<T>) {}

  async run(runOptions: RunOptions): Promise<Fallible<T>> {
    const { certificationAuthority, proxyHooksProvider } = this.options;
    const {
      url,
      wprOptions,
      timeSeedMs,
      loadingTimeoutMs,
      waitUntil,
      delayMs,
      attachmentList,
      compatMode,
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

      await page.evaluate(`location.href = ${JSON.stringify(url)}`);

      const result = await timeBomb(
        willCompleteAnalysis.promise,
        loadingTimeoutMs + delayMs
      );

      attachmentList?.add(
        "screenshot.png",
        new DataAttachment(await page.screenshot())
      );

      return result;
    };

    try {
      const { reportCallback, requestListener, responseTransformer } =
        proxyHooksProvider(willCompleteAnalysis, compatMode);

      return await useProxiedMonitor(
        {
          reportCallback,
          requestListener,
          responseTransformer,
          dnsLookupErrorListener: (err, req) => {
            const requestId = req.headers[X_REQUEST_ID];
            if (requestId && topNavigationRequestIds.has(requestId as string)) {
              willCompleteAnalysis.reject(err);
            }
          },
          wprOptions,
          loadingTimeoutMs,
          timeSeedMs,
          waitUntil,
          certificationAuthority,
        },
        (analysisProxy) =>
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

    return new PuppeteerAgent(browser, options);
  }
}
