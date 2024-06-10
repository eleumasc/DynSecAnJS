import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("Stack inspection through Error object created with exposed constructor", async ({
  page,
  params,
}) => {
  const value = await executeProgram(
    page,
    function (g) {
      var stack = "<failure>";
      String({
        toString: function () {
          stack = new Error().stack!;
          return "";
        },
      });
      g.collect(stack);
    },
    params?.bodyTransformer
  );

  expect(value).toBe(`Error
    at Object.toString (<anonymous>:6:17)
    at String (<anonymous>)
    at <anonymous>:4:5
    at <anonymous>:11:5`);
});
