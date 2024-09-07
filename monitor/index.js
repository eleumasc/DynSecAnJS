var $ = require("./lib/builtin");
var ArraySet = require("./lib/ArraySet");
var collectFlows = require("./collectFlows");

function setupMonitor() {
  var Apply = $.Apply;

  var stateSnapshot = null;
  function getStateSnapshot() {
    return (stateSnapshot = stateSnapshot || {
      loadingCompleted: loadingCompleted,
      uncaughtErrors: uncaughtErrors.values(),
      rawFlows: getRawFlows(),
    });
  }

  function getRawFlows() {
    try {
      return collectFlows();
    } catch (_) {
      return null;
    }
  }

  var loadingCompleted = false;
  $.addEventListener($.global, "load", function () {
    loadingCompleted = true;
    getStateSnapshot();
  });

  var uncaughtErrors = new ArraySet();
  $.addEventListener($.global, "error", function (event) {
    var message = Apply($.ErrorEvent_prototype_message, event);
    uncaughtErrors.add(message);
  });

  return function () {
    return getStateSnapshot();
  };
}

$.global["$__monitor"] = setupMonitor();
