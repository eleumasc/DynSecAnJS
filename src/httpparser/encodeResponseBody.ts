import assert from "assert";
import { compress } from "../core/compression";

export const encodeResponseBody = (
  body: Buffer,
  encoding: string | undefined,
  transferEncoding: string | undefined
): Buffer => {
  if (encoding !== undefined) {
    assert(transferEncoding === undefined);
    return compress(body, encoding);
  } else if (transferEncoding !== undefined) {
    assert(encoding === undefined);
    assert(transferEncoding === "chunked");
    throw new Error("Unsupported 'Transfer-Encoding: chunked'");
  } else {
    return body;
  }
};
