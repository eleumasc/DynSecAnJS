var push = require("./push");
var includes = require("./includes");
var copyArray = require("./copyArray");

function ArraySet() {
  this.array = [];
}

ArraySet.prototype = {
  has: function (element) {
    return includes(this.array, element);
  },
  add: function (element) {
    if (!this.has(element)) {
      push(this.array, element);
    }
  },
  values: function () {
    return copyArray(this.array);
  },
  clear: function () {
    this.array.length = 0;
  },
};

module.exports = ArraySet;
