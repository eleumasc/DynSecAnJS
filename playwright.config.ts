import { TestOptions } from "./tests/playwright/test";
import { defineConfig } from "@playwright/test";

export default defineConfig<TestOptions>({
  testDir: "tests/playwright/",

  projects: [
    {
      name: "regular",
      use: {
        params: { bodyTransformer: undefined },
      },
    },
    // {
    //   name: "jalangi",
    //   use: {
    //     params: { bodyTransformer: transformWithJalangi() },
    //   },
    // },
    // {
    //   name: "linvail",
    //   use: {
    //     params: { bodyTransformer: transformWithLinvail() },
    //   },
    // },
  ],
});
