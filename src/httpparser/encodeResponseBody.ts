// import { HeaderMap } from "./HttpMessageModel";

import assert from "assert";
import { compress } from "../core/compression";

export const encodeResponseBody = (
  body: Buffer,
  contentEncoding: string | undefined,
  transferEncoding: string | undefined
): Buffer => {
  if (typeof contentEncoding !== "undefined") {
    assert(typeof transferEncoding === "undefined");
    return compress(body, contentEncoding);
  } else if (typeof transferEncoding !== "undefined") {
    assert(typeof contentEncoding === "undefined");
    assert(transferEncoding === "chunked");
    throw new Error("Unsupported chunked");
    // return dechunk(body);
  } else {
    return body;
  }
};

// export const chunk = (body: Buffer): Buffer => {};
