import { Builder, WebDriver } from "selenium-webdriver";

export const useWebDriver = async <T>(
  builder: Builder,
  cb: (driver: WebDriver) => Promise<T>
): Promise<T> => {
  const driver = await builder.build();
  try {
    return await cb(driver);
  } finally {
    await driver.quit();
  }
};
