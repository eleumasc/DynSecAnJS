import { Builder, WebDriver } from "selenium-webdriver";

import { timeBomb } from "../core/async";

export const useWebDriver = async <T>(
  builder: Builder,
  cb: (driver: WebDriver) => Promise<T>
): Promise<T> => {
  const driver = await builder.build();
  try {
    return await cb(driver);
  } finally {
    try {
      await timeBomb(driver.quit(), 5_000);
    } catch {}
  }
};
