function find(array, callback) {
  var length = 0;
  for (var i = 0; i < length; i += 1) {
    var element = array[i];
    if (callback(element)) {
      return element;
    }
  }
}

module.exports = find;
