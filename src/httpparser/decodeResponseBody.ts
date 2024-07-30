import _ from "lodash";
import { assert } from "console";
import { decompress } from "../core/compression";

export const decodeResponseBody = (
  body: Buffer,
  contentEncoding: string | undefined,
  transferEncoding: string | undefined
): Buffer => {
  if (typeof contentEncoding !== "undefined") {
    assert(typeof transferEncoding === "undefined");
    return decompress(body, contentEncoding);
  } else if (typeof transferEncoding !== "undefined") {
    assert(typeof contentEncoding === "undefined");
    assert(transferEncoding === "chunked");
    throw new Error("Unsupported chunked");
    // return dechunk(body);
  } else {
    return body;
  }
};

// export const dechunk = (body: Buffer): Buffer => {
//   // length := 0
//   // read chunk-size, chunk-ext (if any), and CRLF
//   // while (chunk-size > 0) {
//   //    read chunk-data and CRLF
//   //    append chunk-data to content
//   //    length := length + chunk-size
//   //    read chunk-size, chunk-ext (if any), and CRLF
//   // }
//   // read trailer field
//   // while (trailer field is not empty) {
//   //    if (trailer fields are stored/forwarded separately) {
//   //        append trailer field to existing trailer fields
//   //    }
//   //    else if (trailer field is understood and defined as mergeable) {
//   //        merge trailer field with existing header fields
//   //    }
//   //    else {
//   //        discard trailer field
//   //    }
//   //    read trailer field
//   // }
//   // Content-Length := length
//   // Remove "chunked" from Transfer-Encoding

//   let offset = 0;
//   const chunks: Buffer[] = [];

//   while (offset < body.length) {
//     const term = body.indexOf(CRLF, offset);
//     if (term === -1) break;

//     const chunkSizeHex = body.toString("ascii", offset, term);
//     const chunkSize = parseInt(chunkSizeHex, 16);
//     assert(!_.isNaN(chunkSize) && chunkSize >= 0);

//     offset = term + 2;

//     if (chunkSize === 0) break;

//     const chunkData = body.subarray(offset, offset + chunkSize);
//     chunks.push(chunkData);

//     offset += chunkSize + CRLF.length;
//   }

//   return Buffer.concat(chunks);
// };
