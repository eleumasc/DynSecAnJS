import { ESVersion } from "./ESVersion";

export default class SyntaxFeature {
  constructor(readonly name: string, readonly esVersion: ESVersion) {}

  toString(): string {
    return `${this.esVersion}:${this.name}`;
  }
}
