import { BodyTransformer } from "../../src/lib/BodyTransformer";
import { test as base } from "@playwright/test";

export type TestOptions = {
  params: { bodyTransformer?: BodyTransformer };
};

export const test = base.extend<TestOptions>({
  params: [{ bodyTransformer: undefined }, { option: true }],
});
