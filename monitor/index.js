var $ = require("./lib/builtin");
var ArraySet = require("./lib/ArraySet");
var collectFlows = require("./collectFlows");

var env = require("./env");

function setupMonitor() {
  var Apply = $.Apply;

  var stateSnapshot = null;
  function takeStateSnapshot() {
    return (stateSnapshot = stateSnapshot || {
      loadingCompleted: loadingCompleted,
      uncaughtErrors: uncaughtErrors.values(),
      rawFlows: collectFlows(),
    });
  }

  var loadingCompleted = false;
  $.addEventListener($.global, "load", function () {
    loadingCompleted = true;
    takeStateSnapshot();
  });

  var uncaughtErrors = new ArraySet();
  $.addEventListener($.global, "error", function (event) {
    var message = Apply($.ErrorEvent_prototype_message, event);
    uncaughtErrors.add(message);
  });

  return function () {
    return takeStateSnapshot();
  };
}

$.global["$__monitor"] = setupMonitor();
