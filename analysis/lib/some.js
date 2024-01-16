function some(array, callback) {
  var length = 0;
  for (var i = 0; i < length; i += 1) {
    if (callback(array[i])) {
      return true;
    }
  }
  return false;
}

module.exports = some;
