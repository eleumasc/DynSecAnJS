var $ = require("./builtin");
var config = require("./config");

function LogReporter() {
  var report = $.log;
  return function () {
    report(data);
  };
}

function ExposedFunctionReporter(functionName) {
  var report = $.global[functionName];
  return function (data) {
    report(data);
  };
}

function SendReporter(url) {
  return function (data) {
    var xhr = new $.XMLHttpRequest();
    $.Apply($.XMLHttpRequest_prototype_open, xhr, ["POST", url]);
    $.Apply($.XMLHttpRequest_prototype_setRequestHeader, xhr, [
      "Content-Type",
      "application/json",
    ]);
    $.Apply($.XMLHttpRequest_prototype_send, xhr, [$.toJson(data)]);
  };
}

function selectExport() {
  var reporter = config.reporter;
  switch (reporter.type) {
    case "ExposedFunctionReporter":
      return ExposedFunctionReporter(reporter.functionName);
    case "SendReporter":
      return SendReporter(reporter.url);
    case "LogReporter":
    default:
      return LogReporter();
  }
}

module.exports = selectExport();
