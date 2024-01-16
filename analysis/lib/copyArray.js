var $ = require("./builtin");

function copyArray(array) {
  return $.Apply($.Array_prototype_concat, array, []);
}

module.exports = copyArray;
