var global = window;

var GetPrototypeOf = Object.getPrototypeOf;
var GetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var DefineProperty = Object.defineProperty;
var Function_prototype_apply = Function.prototype.apply;
var __Apply = Function_prototype_apply.bind(Function_prototype_apply);
var Apply = function (f, thisArg, argsArray) {
  return __Apply(f, [thisArg, argsArray]);
};

function __getGetter(object, key) {
  var d = GetOwnPropertyDescriptor(object, key);
  if (d) {
    return d.get;
  }
}

module.exports = {
  global: global,
  GetPrototypeOf: GetPrototypeOf,
  GetOwnPropertyDescriptor: GetOwnPropertyDescriptor,
  DefineProperty: DefineProperty,
  Apply: Apply,
  Array_prototype_concat: Array.prototype.concat,
  Array_prototype_push: Array.prototype.push,
  String_prototype_indexOf: String.prototype.indexOf,
  String_prototype_split: String.prototype.split,
  String_prototype_substring: String.prototype.substring,
  toJSON: JSON.stringify,
  log: console.log,
  addEventListener: EventTarget.prototype.addEventListener.bind(global),
  ErrorEvent_prototype_message: __getGetter(ErrorEvent.prototype, "message"),
  getCookie: __getGetter(Document.prototype, "cookie").bind(global.document),
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  Storage_prototype_length: __getGetter(Storage.prototype, "length"),
  Storage_prototype_key: Storage.prototype.key,
};
