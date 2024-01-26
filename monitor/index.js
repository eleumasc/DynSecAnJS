var JSMethods = require("./JSMethods.json");
var $ = require("./lib/builtin");
var ArraySet = require("./lib/ArraySet");
var ArrayMap = require("./lib/ArrayMap");
var Arr = require("./lib/Arr");
var report = require("./lib/report");

function setupAnalysis() {
  var global = $.global;
  var GetPrototypeOf = $.GetPrototypeOf;
  var GetOwnPropertyDescriptor = $.GetOwnPropertyDescriptor;
  var DefineProperty = $.DefineProperty;
  var Apply = $.Apply;

  var uncaughtErrors = new ArraySet();
  $.addEventListener($.global, "error", function (event) {
    var message = Apply($.ErrorEvent_prototype_message, event);
    uncaughtErrors.add(message);
  });

  var consoleMessages = new ArraySet();
  var calledBuiltinMethods = new ArraySet();
  (function () {
    function createWrapper(builtin, path) {
      var existingWrapper = wrapperByBuiltin.get(builtin);
      if (existingWrapper) {
        return existingWrapper;
      }

      var defaultReport = function (_thisArg, _argsArray) {
        calledBuiltinMethods.add(path);
      };
      var report = defaultReport;
      switch (path) {
        case "console.log":
          report = function (thisArg, argsArray) {
            consoleMessages.add($.toJson(argsArray[0]));
            defaultReport(thisArg, argsArray);
          };
          break;
      }

      var wrapper = function wrapper() {
        report(this, arguments);
        if (GetPrototypeOf(this) === wrapper.prototype) {
          throw "Cannot invoke wrapper as a constructor";
        }
        return Apply(builtin, this, arguments);
      };
      wrapperByBuiltin.set(builtin, wrapper);

      return wrapper;
    }

    function extendPath(path, name) {
      return path.length !== 0 ? path + "." + name : name;
    }

    function instrumentBuiltinMethods(object, propList, path) {
      for (var it = Arr.iterate(propList), step; !(step = it()).done; ) {
        var prop = step.value;
        if (typeof prop === "object") {
          // nested object
          var k = prop.key;
          var d = GetOwnPropertyDescriptor(object, k);
          if (!d) {
            continue;
          }
          instrumentBuiltinMethods(d.value, prop.props, extendPath(path, k));
        } else if (typeof prop === "string") {
          var d = GetOwnPropertyDescriptor(object, prop);
          if (!d) {
            continue;
          }
          var configurable = d.configurable;
          var enumerable = d.enumerable;
          var get = d.get;
          var set = d.set;
          if (!configurable) {
            continue;
          }
          if (get || set) {
            // accessor property
            DefineProperty(object, prop, {
              configurable: configurable,
              enumerable: enumerable,
              get: get && createWrapper(get, "get " + extendPath(path, prop)),
              set: set && createWrapper(set, "set " + extendPath(path, prop)),
            });
          } else {
            // method property
            var value = d.value;
            var writable = d.writable;
            DefineProperty(object, prop, {
              configurable: configurable,
              enumerable: enumerable,
              value: createWrapper(value, extendPath(path, prop)),
              writable: writable,
            });
          }
        }
      }
    }

    var wrapperByBuiltin = new ArrayMap();
    instrumentBuiltinMethods(global, JSMethods, "");
    wrapperByBuiltin.clear();
  })();

  function getCookieKeys() {
    var cookieString = $.getCookie();
    if (!cookieString) {
      return [];
    }
    var cookieKeys = [];
    var tokens = Apply($.String_prototype_split, cookieString, ["; "]);
    for (var it = Arr.iterate(tokens), step; !(step = it()).done; ) {
      var token = step.value;
      var index = Apply($.String_prototype_indexOf, token, ["="]);
      var key = Apply($.String_prototype_substring, token, [0, index]);
      Apply($.Array_prototype_push, cookieKeys, [key]);
    }
    return cookieKeys;
  }

  function getStorageKeys(storageInstance) {
    var storageKeys = [];
    var length = Apply($.Storage_prototype_length, storageInstance, []);
    for (var i = 0; i < length; i += 1) {
      var key = Apply($.Storage_prototype_key, storageInstance, [i]);
      Apply($.Array_prototype_push, storageKeys, [key]);
    }
    return storageKeys;
  }

  return function () {
    return {
      pageUrl: $.global.location.href,
      uncaughtErrors: uncaughtErrors.values(),
      consoleMessages: consoleMessages.values(),
      calledBuiltinMethods: calledBuiltinMethods.values(),
      cookieKeys: getCookieKeys(),
      localStorageKeys: getStorageKeys($.localStorage),
      sessionStorageKeys: getStorageKeys($.sessionStorage),
    };
  };
}

var analysis = setupAnalysis();

$.addEventListener($.global.document, "DOMContentLoaded", function () {
  if ($.global !== $.global.top) {
    return;
  }
  report(analysis());
});
