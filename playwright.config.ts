import { TestOptions } from "./tests/playwright/test";
import { defineConfig } from "@playwright/test";
import { transformWithAranLinvail } from "./src/tools/aranLinvail";
import { transformWithJalangi } from "./src/tools/jalangi";

export default defineConfig<TestOptions>({
  testDir: "tests/playwright/",

  projects: [
    {
      name: "regular",
      use: {
        params: { bodyTransformer: undefined },
      },
    },
    {
      name: "jalangi",
      use: {
        params: { bodyTransformer: transformWithJalangi() },
      },
    },
    {
      name: "linvail",
      use: {
        params: {
          bodyTransformer: transformWithAranLinvail("identity"),
        },
      },
    },
  ],
});
