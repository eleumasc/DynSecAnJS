import { HttpResponseModel } from "./HttpMessageModel";
import { assert } from "console";
import { decompress } from "../core/compression";
import { getSingleHeader } from "./getSingleHeader";

export const decodeResponseBody = (response: HttpResponseModel): Buffer => {
  const { headers, body } = response;
  const encoding = getSingleHeader(headers, "content-encoding");
  const transferEncoding = getSingleHeader(headers, "transfer-encoding");

  if (encoding !== undefined) {
    assert(transferEncoding === undefined);
    return decompress(body, encoding);
  } else if (transferEncoding !== undefined) {
    assert(encoding === undefined);
    assert(transferEncoding === "chunked");
    throw new Error("Unsupported 'Transfer-Encoding: chunked'");
  } else {
    return body;
  }
};
