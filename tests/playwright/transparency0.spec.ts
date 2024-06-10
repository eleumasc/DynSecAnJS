import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("eval.toString()", async ({ page, params }) => {
  const value = await executeProgram(
    page,
    function (g) {
      g.collect(eval.toString());
    },
    params?.bodyTransformer
  );

  expect(value).toBe("function eval() { [native code] }");
});
