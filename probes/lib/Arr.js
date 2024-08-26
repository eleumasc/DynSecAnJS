var $ = require("./builtin");

function clear(array) {
  array.length = 0;
}

function copy(array) {
  return $.Apply($.Array_prototype_concat, array, []);
}

function find(array, callback) {
  for (var it = iterate(array), step; !(step = it()).done; ) {
    var element = step.value;
    if (callback(element)) {
      return element;
    }
  }
}
function includes(array, element) {
  var found = false;
  for (var it = iterate(array), step; !(step = it()).done; ) {
    if (step.value === element) {
      found = true;
      break;
    }
  }
  return found;
}

function iterate(array) {
  var i = 0;
  var length = array.length;
  function next() {
    if (i < length) {
      var value = array[i];
      i += 1;
      return { done: false, value: value };
    } else {
      return { done: true };
    }
  }
  return next;
}

function push(array, element) {
  $.Apply($.Array_prototype_push, array, [element]);
}

function some(array, callback) {
  var found = false;
  for (var it = iterate(array), step; !(step = it()).done; ) {
    if (callback(step.value)) {
      found = true;
      break;
    }
  }
  return found;
}

module.exports = {
  clear: clear,
  copy: copy,
  find: find,
  includes: includes,
  iterate: iterate,
  push: push,
  some: some,
};
