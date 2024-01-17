var Arr = require("./Arr");

function ArrayMap() {
  this.array = [];
}

ArrayMap.prototype = {
  get: function (key) {
    var entry = Arr.find(this.array, entryHasKey(key));
    if (entry) {
      return entry.value;
    }
  },
  has: function (key) {
    return Arr.some(this.array, entryHasKey(key));
  },
  set: function (key, value) {
    if (!this.has(key)) {
      Arr.push(this.array, { key: key, value: value });
    }
  },
  clear: function () {
    Arr.clear(this.array);
  },
};

function entryHasKey(key) {
  return function (entry) {
    return entry.key === key;
  };
}

module.exports = ArrayMap;
