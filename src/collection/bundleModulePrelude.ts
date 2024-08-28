export const bundleModulePrelude = `function prelude() {
  function outer(modules, cache, entry) {
    function newRequire(name) {
      if (!cache[name]) {
        if (!modules[name]) {
          var err = new Error("Cannot find module '" + name + "'");
          err.code = "MODULE_NOT_FOUND";
          throw err;
        }

        var module = (cache[name] = {
          exports: {},
          meta: {
            __proto__: null,
            url: name,
            resolve: function () {
              var err = new Error("import.meta.resolve() is not supported");
              err.code = "UNSUPPORTED_FEATURE";
              throw err;
            },
          },
        });
        modules[name][0].call(
          void 0,
          function (x) {
            var id = modules[name][1][x];
            return newRequire(id ? id : x);
          },
          module,
          module.exports
        );
      }
      return cache[name].exports;
    }
    for (var i = 0; i < entry.length; i++) newRequire(entry[i]);

    return (window["$__require"] = newRequire);
  }

  return outer;
}`;
