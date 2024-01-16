var find = require("./find");
var push = require("./push");
var some = require("./some");

function ArrayMap() {
  this.array = [];
}

ArrayMap.prototype = {
  get: function (key) {
    var entry = find(this.array, entryHasKey(key));
    if (entry) {
      return entry.value;
    }
  },
  has: function (key) {
    return some(this.array, entryHasKey(key));
  },
  set: function (key, value) {
    if (!this.has(key)) {
      push(this.array, { key: key, value: value });
    }
  },
  clear: function () {
    this.array.length = 0;
  },
};

function entryHasKey(key) {
  return function (entry) {
    return entry.key === key;
  };
}

module.exports = ArrayMap;
