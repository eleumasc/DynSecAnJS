var $ = require("./builtin");

function ExposedFunctionReporter(functionName) {
  var report = $.global[functionName];
  return function (data) {
    report(data);
  };
}

function LogReporter() {
  var report = $.log;
  return function () {
    report(data);
  };
}

function selectExport() {
  var reporter = $.fromJson(process.env.REPORTER);
  switch (reporter.type) {
    case "ExposedFunctionReporter":
      return ExposedFunctionReporter(reporter.functionName);
    case "LogReporter":
    default:
      return LogReporter();
  }
}

module.exports = selectExport();
