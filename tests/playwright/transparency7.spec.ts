import { executeProgram } from "./helpers";
import { expect } from "@playwright/test";
import { test } from "./test";

test("Count invocations to standard built-in ES5 prototype methods", async ({
  page,
  params,
}) => {
  const value = await executeProgram(
    page,
    function (g) {
      var Function = g.Function;
      var FunctionPrototype = Function.prototype;
      var apply = FunctionPrototype.apply.bind(FunctionPrototype.apply);
      var getOwnPropertyNames = g.Object.getOwnPropertyNames;
      var getOwnPropertyDescriptor = g.Object.getOwnPropertyDescriptor;

      function installWrappers(analysis) {
        function wrapConstructor(o, p) {
          var Ctor = getOwnPropertyDescriptor(o, p).value;
          if (typeof Ctor !== "function") return;
          var prototype = Ctor.prototype;

          wrapMethods(Ctor);
          wrapMethods(prototype);
        }

        function wrapMethods(o) {
          var keys = getOwnPropertyNames(o);
          var i, len;
          for (i = 0, len = keys.length; i < len; ++i) {
            wrapMethod(o, keys[i]);
          }
        }

        function wrapMethod(o, p) {
          if (p === "constructor") return;
          var wrappee = getOwnPropertyDescriptor(o, p).value;
          if (typeof wrappee !== "function") return;
          if (wrappee === FunctionPrototype) return;
          var wrapper = function () {
            analysis();
            return apply(wrappee, [this, arguments]);
          };
          o[p] = wrapper;
        }

        var globalConstructorKeys = [
          "Object",
          "Function",
          "Array",
          "String",
          "Boolean",
          "Number",
          "Date",
          "RegExp",
          "Error",
        ];
        var globalFunctionKeys = [
          "parseInt",
          "parseFloat",
          "isNaN",
          "isFinite",
          "decodeURI",
          "decodeURIComponent",
          "encodeURI",
          "encodeURIComponent",
        ];
        var globalObjectKeys = ["Math", "JSON"];

        var i, len;
        for (i = 0, len = globalConstructorKeys.length; i < len; ++i) {
          wrapConstructor(g, globalConstructorKeys[i]);
        }
        for (i = 0, len = globalFunctionKeys.length; i < len; ++i) {
          wrapMethod(g, globalFunctionKeys[i]);
        }
        for (i = 0, len = globalObjectKeys.length; i < len; ++i) {
          wrapMethods(g[globalObjectKeys[i]]);
        }
      }

      var count = 0;
      function increment() {
        count += 1;
      }
      installWrappers(increment);

      // begin program
      var graph = {
        A: { B: 1, C: 4 },
        B: { A: 1, C: 2, D: 5 },
        C: { A: 4, B: 2, D: 1 },
        D: { B: 5, C: 1 },
      };
      function dijkstra(r, a) {
        for (
          var n = {}, t = new Set(), f = Object.keys(r), i = 0, e = f;
          i < e.length;
          i++
        )
          n[e[i]] = 1 / 0;
        for (n[a] = 0; f.length; ) {
          f.sort(function (r, a) {
            return n[r] - n[a];
          });
          var o = f.shift();
          if (typeof o !== "string" || n[o] === 1 / 0) break;
          for (var h in (t.add(o), r[o]))
            if (!t.has(h)) {
              var s = n[o] + r[o][h];
              s < n[h] && (n[h] = s);
            }
        }
        return n;
      }
      dijkstra(graph, "A");
      // end program
      g.collect(count);
    },
    params?.bodyTransformer
  );

  expect(value).toBe(9);
});
