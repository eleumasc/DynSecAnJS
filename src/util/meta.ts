const META = new WeakMap();

export const getMeta = (source: any): any | undefined => {
  return META.get(source);
};

export const setMeta = <T extends object>(target: T, value: any): T => {
  META.set(target, value);
  return target;
};

export const propagateMeta = <T extends object>(target: T, source: any): T => {
  const value = getMeta(source);
  return typeof value !== "undefined" ? setMeta(target, value) : target;
};
