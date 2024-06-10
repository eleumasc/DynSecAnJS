import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("Apply Function.prototype.toString to user-defined function", async ({
  page,
  params,
}) => {
  const value = await executeProgram(
    page,
    function (g) {
      g.collect(Function.prototype.toString.apply(function f() {}));
    },
    params?.bodyTransformer
  );

  expect(value).toBe("function f() {}");
});
