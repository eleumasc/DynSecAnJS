var $ = require("./builtin");
var config = require("./config");

function collectFlowsFromJalangiTT() {
  return $.global["__ytjs_getTrackingResult"]();
}

function collectFlowsFromProjectFoxhound() {
  return $.global["$__taintReports"];
}

function selectExport() {
  switch (config.ifaToolName) {
    case "JalangiTT":
      return collectFlowsFromJalangiTT;
    case "ProjectFoxhound":
      return collectFlowsFromProjectFoxhound;
    default:
      return function () {
        return void 0;
      };
  }
}

module.exports = selectExport();
