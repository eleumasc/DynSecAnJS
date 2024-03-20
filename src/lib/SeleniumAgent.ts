import { Buffer } from "buffer";
import { timeBomb } from "./util/async";
import CertificationAuthority from "./CertificationAuthority";
import { Fallible } from "./util/Fallible";
import Deferred from "./util/Deferred";
import { useProxiedMonitor } from "./useProxiedMonitor";
import { Agent, RunOptions } from "./Agent";
import { ProxyHooksProvider } from "./ProxyHooks";
import { useTcpTunnel } from "./util/useTcpTunnel";
import { Browser, Builder, Capabilities, WebDriver } from "selenium-webdriver";
import { useWebDriver } from "./useWebDriver";
import { DataAttachment } from "./ArchiveWriter";
import { generateSPKIFingerprint } from "mockttp";
import chrome from "selenium-webdriver/chrome";
import firefox from "selenium-webdriver/firefox";

export interface Options<T> {
  thisHost: string;
  certificationAuthority: CertificationAuthority;
  proxyHooksProvider: ProxyHooksProvider<T>;
}

export interface WebDriverOptions {
  browser: string;
  server: string;
  binaryPath: string;
  args: string[];
  headless?: boolean;
}

export class SeleniumAgent<T> implements Agent<T> {
  constructor(
    readonly webDriverOptions: WebDriverOptions,
    readonly options: Options<T>
  ) {}

  async run(runOptions: RunOptions): Promise<Fallible<T>> {
    const { webDriverOptions } = this;
    const { thisHost, certificationAuthority, proxyHooksProvider } =
      this.options;
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

    const runPage = async (driver: WebDriver): Promise<T> => {
      await driver.executeScript(`location.href = ${JSON.stringify(url)}`);

      const result = await timeBomb(
        willCompleteAnalysis.promise,
        loadingTimeoutMs + delayMs
      );

      attachmentList?.add(
        "screenshot.png",
        new DataAttachment(Buffer.from(await driver.takeScreenshot(), "base64"))
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
          dnsLookupErrorListener: (err, req) => {},
          wprOptions,
          loadingTimeoutMs,
          timeSeedMs,
          waitUntil,
          certificationAuthority,
        },
        (analysisProxy) =>
          useTcpTunnel(
            {
              targetPort: analysisProxy.getPort(),
              targetHost: "127.0.0.1",
              serverHost: thisHost,
            },
            async (tcpTunnelAddress) => {
              const createBuilder = () => {
                const { browser, server, binaryPath, args, headless } =
                  webDriverOptions;
                const builder = new Builder()
                  .forBrowser(browser)
                  .usingServer(server);
                switch (browser) {
                  case Browser.CHROME:
                    return builder.setChromeOptions(
                      new chrome.Options()
                        .setChromeBinaryPath(binaryPath)
                        .addArguments(
                          ...args,
                          `--proxy-server=${tcpTunnelAddress.address}:${tcpTunnelAddress.port}`,
                          `--ignore-certificate-errors-spki-list=${generateSPKIFingerprint(
                            certificationAuthority.getCertificate()
                          )}`,
                          ...(headless ?? true ? ["--headless=new"] : [])
                        )
                    );
                  case Browser.FIREFOX: {
                    const profile = new firefox.Profile();
                    profile.setPreference("network.proxy.type", 1);
                    profile.setPreference(
                      "network.proxy.http",
                      tcpTunnelAddress.address
                    );
                    profile.setPreference(
                      "network.proxy.http_port",
                      tcpTunnelAddress.port
                    );
                    profile.setPreference(
                      "network.proxy.ssl",
                      tcpTunnelAddress.address
                    );
                    profile.setPreference(
                      "network.proxy.ssl_port",
                      tcpTunnelAddress.port
                    );
                    const capabilities = Capabilities.firefox();
                    capabilities.set("acceptInsecureCerts", true);
                    return builder
                      .setFirefoxOptions(
                        new firefox.Options()
                          .setBinary(binaryPath)
                          .addArguments(
                            ...(headless ?? true ? ["--headless"] : [])
                          )
                          .setProfile(profile)
                      )
                      .withCapabilities(capabilities);
                  }
                  default:
                    throw new Error(`Unknown browser: ${browser}`);
                }
              };

              return useWebDriver(createBuilder(), async (driver) => {
                const executionDetail = await runPage(driver);
                return {
                  status: "success",
                  val: executionDetail,
                };
              });
            }
          )
      );
    } catch (e) {
      return {
        status: "failure",
        reason: String(e),
      };
    }
  }

  async terminate(): Promise<void> {}

  static async create<T>(
    webDriverOptions: WebDriverOptions,
    options: Options<T>
  ): Promise<SeleniumAgent<T>> {
    return new SeleniumAgent(webDriverOptions, options);
  }
}
