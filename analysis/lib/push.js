var $ = require("./builtin");

function push(array, element) {
  $.Apply($.Array_prototype_push, array, [element]);
}

module.exports = push;
