var Arr = require("./Arr");

function ArraySet() {
  this.array = [];
}

ArraySet.prototype = {
  has: function (element) {
    return Arr.includes(this.array, element);
  },
  add: function (element) {
    if (!this.has(element)) {
      Arr.push(this.array, element);
    }
  },
  values: function () {
    return Arr.copy(this.array);
  },
  clear: function () {
    Arr.clear(this.array);
  },
};

module.exports = ArraySet;
