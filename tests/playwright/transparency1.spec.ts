import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("Apply Function.prototype.toString to eval", async ({
  page,
  params,
}) => {
  const value = await executeProgram(
    page,
    function (g) {
      g.collect(Function.prototype.toString.apply(eval));
    },
    params?.bodyTransformer
  );

  expect(value).toBe("function eval() { [native code] }");
});
