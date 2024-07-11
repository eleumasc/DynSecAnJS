var $ = require("./lib/builtin");
var ArraySet = require("./lib/ArraySet");
var report = require("./lib/report");
var config = require("./lib/config");
var collectFlows = require("./lib/collectFlows");

function setupAnalysis() {
  var Apply = $.Apply;

  var uncaughtErrors = new ArraySet();
  $.addEventListener($.global, "error", function (event) {
    var message = Apply($.ErrorEvent_prototype_message, event);
    uncaughtErrors.add(message);
  });

  return function (loadingCompleted) {
    return {
      pageUrl: $.global.location.href,
      uncaughtErrors: uncaughtErrors.values(),
      consoleMessages: [],
      calledBuiltinMethods: [],
      cookieKeys: [],
      localStorageKeys: [],
      sessionStorageKeys: [],
      loadingCompleted: loadingCompleted,
      flows: collectFlows(),
    };
  };
}

require("./deterministic");

var analysis = setupAnalysis();

var reported = false;
function reportAnalysis(loadingCompleted) {
  if (reported) {
    return;
  }
  if ($.global !== $.global.top) {
    return;
  }
  report(analysis(loadingCompleted));
}

$.setTimeout(function () {
  reportAnalysis(false);
}, config.loadingTimeoutMs);

$.addEventListener($.global, "load", function () {
  reportAnalysis(true);
});
