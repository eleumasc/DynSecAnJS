import { CRLF } from "./consts";
import _ from "lodash";
import assert from "assert";

export default class BufferReader {
  protected offset = 0;

  constructor(readonly buffer: Buffer) {}

  available(): boolean {
    const { buffer, offset } = this;

    return offset < buffer.length;
  }

  read(n: number): Buffer {
    assert(_.isLength(n));

    const { buffer, offset } = this;

    const end = offset + n;
    assert(end < buffer.length);
    const result = buffer.subarray(offset, end);

    this.offset = end;

    return result;
  }

  readUntilEnd = (): Buffer => {
    const { buffer, offset } = this;

    const result = buffer.subarray(offset);

    this.offset = buffer.length;

    return result;
  };

  readLine = (): string => {
    const { buffer, offset } = this;

    const end = buffer.indexOf(CRLF, offset);
    assert(end !== -1);
    const result = buffer.subarray(offset, end).toString();

    this.offset = end + 2;

    return result;
  };
}
