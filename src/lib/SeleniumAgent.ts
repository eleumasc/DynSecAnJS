import { Agent, AgentController, UseOptions, Viewport } from "./Agent";
import { Browser, Builder, Capabilities, WebDriver } from "selenium-webdriver";

import { Buffer } from "buffer";
import firefox from "selenium-webdriver/firefox";
import { localhost } from "../core/env";
import { useGeckoDriver } from "./GeckoDriver";
import { useWebDriver } from "./WebDriver";

export interface Options {
  webDriverOptions: WebDriverOptions;
}

export interface WebDriverOptions {
  browser: string;
  binaryPath: string;
  args: string[];
  headless?: boolean;
}

export class SeleniumAgent implements Agent {
  constructor(readonly options: Options) {}

  use<T>(
    useOptions: UseOptions,
    cb: (controller: AgentController) => Promise<T>
  ): Promise<T> {
    const { webDriverOptions } = this.options;
    const { proxyPort } = useOptions;

    return useGeckoDriver((geckoDriver) =>
      useWebDriver(
        createWebDriverBuilder(
          webDriverOptions,
          { address: localhost, port: proxyPort },
          geckoDriver.getDriverHost()
        ),
        (driver) => cb(new SeleniumAgentController(driver))
      )
    );
  }

  static async create(options: Options): Promise<SeleniumAgent> {
    return new SeleniumAgent(options);
  }
}

export class SeleniumAgentController implements AgentController {
  constructor(protected driver: WebDriver) {}

  async navigate(url: string): Promise<void> {
    await this.driver.executeScript(`location.assign(${JSON.stringify(url)})`);
  }

  async screenshot(): Promise<Buffer> {
    return Buffer.from(await this.driver.takeScreenshot(), "base64");
  }

  async setViewport({ width, height }: Viewport): Promise<void> {
    const WINDOW_SIZE_SCRIPT = `
return [
  window.outerWidth,
  window.innerWidth,
  window.outerHeight,
  window.innerHeight
];
`;
    const [outerWidth, innerWidth, outerHeight, innerHeight] =
      (await this.driver.executeScript(
        WINDOW_SIZE_SCRIPT
      )) as unknown as number[];
    await this.driver
      .manage()
      .window()
      .setSize(
        outerWidth - innerWidth + width,
        outerHeight - innerHeight + height
      );
  }
}

const createWebDriverBuilder = (
  webDriverOptions: WebDriverOptions,
  proxyServer: { address: string; port: number },
  driverHost: string
) => {
  const { browser, binaryPath, args, headless } = webDriverOptions;
  const builder = new Builder()
    .forBrowser(browser)
    .usingServer(`http://${driverHost}`);
  switch (browser) {
    case Browser.FIREFOX: {
      const rawPrefs = {
        "network.proxy.type": 1,
        "network.proxy.http": proxyServer.address,
        "network.proxy.http_port": proxyServer.port,
        "network.proxy.ssl": proxyServer.address,
        "network.proxy.ssl_port": proxyServer.port,
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
