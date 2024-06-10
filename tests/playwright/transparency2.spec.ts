import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("Apply Function.prototype.toString to Function.prototype.apply", async ({
  page,
  params,
}) => {
  const value = await executeProgram(
    page,
    function (g) {
      g.collect(Function.prototype.toString.apply(Function.prototype.apply));
    },
    params?.bodyTransformer
  );

  expect(value).toBe("function apply() { [native code] }");
});
