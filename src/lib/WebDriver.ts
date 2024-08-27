import { Builder, WebDriver } from "selenium-webdriver";

import { rmSync } from "fs";
import { timeBomb } from "../util/timeout";

export const useWebDriver = async <T>(
  builder: Builder,
  cb: (driver: WebDriver) => Promise<T>
): Promise<T> => {
  const driver = await builder.build();
  const capabilities = (await driver.getSession()).getCapabilities();
  const pid = capabilities.get("moz:processID");
  const profilePath = capabilities.get("moz:profile");
  try {
    return await cb(driver);
  } finally {
    try {
      await timeBomb(driver.quit(), 5_000);
    } catch {
      process.kill(pid, "SIGKILL");
    }
    rmSync(profilePath, { force: true, recursive: true });
  }
};
