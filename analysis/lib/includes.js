function includes(array, element) {
  var length = array.length;
  for (var i = 0; i < length; i += 1) {
    if (array[i] === element) {
      return true;
    }
  }
  return false;
}

module.exports = includes;
