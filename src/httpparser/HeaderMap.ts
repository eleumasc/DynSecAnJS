export default class HeaderMap {
  protected _entries: Map<string, string[]>;

  constructor(entries?: [string, string][]) {
    this._entries = entries
      ? entries.reduce((acc, entry) => {
          const [name, value] = entry;
          const sanitizedName = sanitizeName(name);
          let values = acc.get(sanitizedName);
          if (!values) {
            acc.set(sanitizedName, (values = []));
          }
          values.push(value);
          return acc;
        }, new Map())
      : new Map();
  }

  has(name: string): boolean {
    return this._entries.has(sanitizeName(name));
  }

  get(name: string): string | undefined {
    const sanitizedName = sanitizeName(name);
    const values = this._entries.get(sanitizedName);
    if (!values) {
      return undefined;
    }
    return values[0];
  }

  getAll(name: string): string[] {
    const sanitizedName = sanitizeName(name);
    const values = this._entries.get(sanitizedName);
    if (!values) {
      return [];
    }
    return [...values];
  }

  *entries(): Generator<[string, string]> {
    for (const [name, values] of this._entries) {
      for (const value of values) {
        yield [name, value];
      }
    }
  }

  *[Symbol.iterator]() {
    yield* this.entries();
  }

  set(name: string, value: string) {
    this._entries.set(sanitizeName(name), [value]);
    return this;
  }

  add(name: string, value: string) {
    const sanitizedName = sanitizeName(name);
    const values = this._entries.get(sanitizedName) ?? [];
    this._entries.set(sanitizedName, [...values, value]);
    return this;
  }

  delete(name: string) {
    this._entries.delete(sanitizeName(name));
    return this;
  }

  copy(): HeaderMap {
    const headerMap = new HeaderMap();
    headerMap._entries = new Map(this._entries);
    return headerMap;
  }
}

const sanitizeName = (name: string) => name.trim().toLowerCase();
