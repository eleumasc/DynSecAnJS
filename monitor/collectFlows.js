var $ = require("./lib/builtin");
var env = require("./env");

function collectFlowsFromJalangiTT() {
  return $.global["__ytjs_getTrackingResult"]();
}

function collectFlowsFromProjectFoxhound() {
  return $.global["$__taintReports"];
}

function selectExport() {
  switch (env.toolName) {
    case "JalangiTT":
      return collectFlowsFromJalangiTT;
    case "ProjectFoxhound":
      return collectFlowsFromProjectFoxhound;
    default:
      return function () {
        return null;
      };
  }
}

module.exports = selectExport();
