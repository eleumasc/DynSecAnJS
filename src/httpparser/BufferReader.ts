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
    const res = buffer.subarray(offset, end);

    this.offset = end;

    return res;
  }

  readUntilEnd = (): Buffer => {
    const { buffer, offset } = this;

    const res = buffer.subarray(offset);

    this.offset = buffer.length;

    return res;
  };

  readLine = (): string => {
    const { buffer, offset } = this;

    const end = buffer.indexOf(CRLF, offset);
    assert(end !== -1);
    const res = buffer.subarray(offset, end).toString();

    this.offset = end + 2;

    return res;
  };
}
