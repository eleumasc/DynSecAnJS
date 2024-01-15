function collectMethods(rootObject) {
  const visited = new WeakSet();

  function visit(object) {
    if (visited.has(object)) {
      return [];
    }
    visited.add(object);

    const notWebkitFilter = (k) => !k.toLowerCase().startsWith("webkit");
    const ownPropertyNames =
      Object.getOwnPropertyNames(object).filter(notWebkitFilter);

    const ctors = ownPropertyNames
      .filter((k) => {
        const d = Object.getOwnPropertyDescriptor(object, k);
        const { value } = d;
        return (
          typeof value === "function" &&
          Boolean(value.prototype) &&
          value !== Function.prototype
        );
      })
      .map((k) => ({ key: k, props: visit(object[k]) }))
      .filter(({ props }) => props.length !== 0);

    const methods = ownPropertyNames.filter((k) => {
      const d = Object.getOwnPropertyDescriptor(object, k);
      const { configurable, value } = d;
      return (
        configurable &&
        typeof value === "function" &&
        !Boolean(value.prototype) &&
        value !== Function.prototype
      );
    });

    const accessors = ownPropertyNames.filter((k) => {
      const d = Object.getOwnPropertyDescriptor(object, k);
      const { configurable, get, set } = d;
      return configurable && (Boolean(get) || Boolean(set));
    });

    const objects = ownPropertyNames
      .filter((k) => {
        const d = Object.getOwnPropertyDescriptor(object, k);
        const { value } = d;
        return (
          (typeof value === "object" && value !== null) ||
          value === Function.prototype
        );
      })
      .map((k) => ({ key: k, props: visit(object[k]) }))
      .filter(({ props }) => props.length !== 0);

    return [...ctors, ...methods, ...accessors, ...objects];
  }

  const result = visit(rootObject);

  const filteredResult = result.filter((entry) => {
    if (typeof entry === "string") {
      switch (entry) {
        case "Proxy":
        case "NodeFilter":
          return false;
      }
    } else if (typeof entry === "object") {
      const { key } = entry;
      switch (key) {
        case "0":
          return false;
      }
    }
    return true;
  });

  return filteredResult;
}

collectMethods(this);
