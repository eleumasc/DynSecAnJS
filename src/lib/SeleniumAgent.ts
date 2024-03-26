import { Agent, PageController, UsePageOptions } from "./Agent";
import { Browser, Builder, Capabilities, WebDriver } from "selenium-webdriver";

import { AddressInfo } from "net";
import { Buffer } from "buffer";
import CA from "../core/CA";
import chrome from "selenium-webdriver/chrome";
import firefox from "selenium-webdriver/firefox";
import { useTcpTunnel } from "../core/TcpTunnel";
import { useWebDriver } from "./WebDriver";

export interface Options {
  webDriverOptions: WebDriverOptions;
  localHost: string;
}

export interface WebDriverOptions {
  browser: string;
  server: string;
  binaryPath: string;
  args: string[];
  headless?: boolean;
}

export class SeleniumAgent implements Agent {
  constructor(readonly options: Options) {}

  usePage<T>(
    options: UsePageOptions,
    cb: (page: PageController) => Promise<T>
  ): Promise<T> {
    const { webDriverOptions, localHost } = this.options;
    const { proxyPort } = options;

    return useTcpTunnel(
      {
        targetPort: proxyPort,
        targetHost: "127.0.0.1",
        serverHost: localHost,
      },
      (tcpTunnelAddress) =>
        useWebDriver(
          createWebDriverBuilder(webDriverOptions, tcpTunnelAddress),
          (driver) => cb(new SeleniumPageController(driver))
        )
    );
  }

  async terminate(): Promise<void> {}

  static async create(options: Options): Promise<SeleniumAgent> {
    return new SeleniumAgent(options);
  }
}

export class SeleniumPageController implements PageController {
  constructor(protected driver: WebDriver) {}

  async navigate(url: string): Promise<void> {
    await this.driver.executeScript(`location.href = ${JSON.stringify(url)}`);
  }

  async screenshot(): Promise<Buffer> {
    return Buffer.from(await this.driver.takeScreenshot(), "base64");
  }
}

const createWebDriverBuilder = (
  webDriverOptions: WebDriverOptions,
  tcpTunnelAddress: AddressInfo
) => {
  const { browser, server, binaryPath, args, headless } = webDriverOptions;
  const builder = new Builder().forBrowser(browser).usingServer(server);
  switch (browser) {
    case Browser.CHROME:
      return builder.setChromeOptions(
        new chrome.Options()
          .setChromeBinaryPath(binaryPath)
          .addArguments(
            ...args,
            `--proxy-server=${tcpTunnelAddress.address}:${tcpTunnelAddress.port}`,
            `--ignore-certificate-errors-spki-list=${CA.get().getSPKIFingerprint()}`,
            ...(headless ?? true ? ["--headless=new"] : [])
          )
      );

    case Browser.FIREFOX: {
      const rawPrefs = {
        "network.proxy.type": 1,
        "network.proxy.http": tcpTunnelAddress.address,
        "network.proxy.http_port": tcpTunnelAddress.port,
        "network.proxy.ssl": tcpTunnelAddress.address,
        "network.proxy.ssl_port": tcpTunnelAddress.port,
        "network.captive-portal-service.enabled": false,
      };
      const profile = new firefox.Profile();
      for (const [key, value] of Object.entries(rawPrefs)) {
        profile.setPreference(key, value as any);
      }
      const capabilities = Capabilities.firefox();
      capabilities.set("acceptInsecureCerts", true);
      return builder
        .setFirefoxOptions(
          new firefox.Options()
            .setBinary(binaryPath)
            .addArguments(...(headless ?? true ? ["--headless"] : []))
            .setProfile(profile)
        )
        .withCapabilities(capabilities);
    }

    default:
      throw new Error(`Unknown browser: ${browser}`);
  }
};
