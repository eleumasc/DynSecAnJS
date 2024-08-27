var $ = require("./lib/builtin");
var ArraySet = require("./lib/ArraySet");
var collectFlows = require("./collectFlows");

function setupMonitor() {
  var Apply = $.Apply;

  var state = { loadingCompleted: false };
  $.addEventListener($.global, "load", function () {
    state = {
      loadingCompleted: true,
      uncaughtErrors: uncaughtErrors.values(),
      flows: collectFlows(),
    };
  });

  var uncaughtErrors = new ArraySet();
  $.addEventListener($.global, "error", function (event) {
    var message = Apply($.ErrorEvent_prototype_message, event);
    uncaughtErrors.add(message);
  });

  return function () {
    return state;
  };
}

$.global["$__monitor"] = setupMonitor();
