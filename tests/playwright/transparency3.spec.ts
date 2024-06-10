import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("Apply Function.prototype.toString to Function.prototype.toString", async ({
  page,
  params,
}) => {
  const value = await executeProgram(
    page,
    function (g) {
      g.collect(Function.prototype.toString.apply(Function.prototype.toString));
    },
    params?.bodyTransformer
  );

  expect(value).toBe("function toString() { [native code] }");
});
