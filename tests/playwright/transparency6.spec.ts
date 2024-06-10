import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("Stack inspection through Error object thrown by the interpreter", async ({
  page,
  params,
}) => {
  const value = await executeProgram(
    page,
    function (g) {
      var stack = "<failure>";
      String({
        toString: function () {
          try {
            // @ts-expect-error
            variableThatDoesNotExist;
          } catch (e) {
            stack = e.stack!;
          }
          return "";
        },
      });
      g.collect(stack);
    },
    params?.bodyTransformer
  );

  expect(value).toBe(`ReferenceError: variableThatDoesNotExist is not defined
    at Object.toString (<anonymous>:8:11)
    at String (<anonymous>)
    at <anonymous>:4:5
    at <anonymous>:16:5`);
});
