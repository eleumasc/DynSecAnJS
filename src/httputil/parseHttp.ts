import { HttpMessage, HttpRequest, HttpResponse } from "./HttpMessage";

import BufferReader from "./BufferReader";
import HeaderMap from "./HeaderMap";
import _ from "lodash";
import assert from "assert";

export const parseHttpRequest = (input: Buffer): HttpRequest => {
  const { headLine0, headLine1, headLine2, headers, body, trailingHeaders } =
    parseHttpMessage(input);

  assert(headLine2.length > 0);

  return {
    method: headLine0.toUpperCase(),
    target: headLine1,
    protocolVersion: headLine2.toUpperCase(),
    headers,
    body,
    trailingHeaders,
  };
};

export const parseHttpResponse = (input: Buffer): HttpResponse => {
  const { headLine0, headLine1, headLine2, headers, body, trailingHeaders } =
    parseHttpMessage(input);

  const statusCode = _.toInteger(headLine1);
  assert(!_.isNaN(statusCode) && statusCode >= 100 && statusCode <= 599);

  return {
    protocolVersion: headLine0.toUpperCase(),
    statusCode,
    statusMessage: headLine2,
    headers,
    body,
    trailingHeaders,
  };
};

const parseHttpMessage = (input: Buffer): HttpMessage => {
  const reader = new BufferReader(input);

  const [headLine0, headLine1, headLine2] = readHeadLine(reader);

  const headers = readHeaders(reader);

  const { body, trailingHeaders } = readBody(reader, headers);

  return {
    headLine0,
    headLine1,
    headLine2,
    headers,
    body,
    trailingHeaders,
  };
};

const readHeadLine = (reader: BufferReader): [string, string, string] => {
  const line = reader.readLine();

  const matches = line.trim().match(/^([^\s]+)\s+([^\s]+)\s*(.*)?$/);
  assert(matches !== null);
  return [matches[1], matches[2], matches[3] ?? ""];
};

const readHeaders = (reader: BufferReader): HeaderMap => {
  let headerEntries: [string, string][] = [];

  for (let line; (line = reader.readLine()).length !== 0; ) {
    const sep = line.indexOf(":");
    assert(sep !== -1);

    const name = line.substring(0, sep).trim();
    assert(name.length > 0);
    const value = line.substring(sep + 1).trim();

    headerEntries = [...headerEntries, [name, value]];
  }

  return new HeaderMap(headerEntries);
};

interface ReadBodyResult {
  body: Buffer;
  trailingHeaders: HeaderMap;
}

const readBody = (reader: BufferReader, headers: HeaderMap): ReadBodyResult => {
  const data = reader.readUntilEnd();

  const length = headers.get("content-length");
  const transferEncoding = headers.get("transfer-encoding");

  if (transferEncoding !== undefined) {
    assert(transferEncoding === "chunked");
    assert(length === undefined);
    return readChunkedBody(new BufferReader(data));
  } else {
    // if (length !== undefined) {
    //   const intLength = parseInt(length);
    //   assert(_.isLength(intLength));
    //   assert(data.length === intLength);
    // }
    return { body: data, trailingHeaders: new HeaderMap() };
  }
};

const readChunkedBody = (reader: BufferReader): ReadBodyResult => {
  const chunks: Buffer[] = [];

  for (;;) {
    const line = reader.readLine();
    const lineComment = line.indexOf(";");
    const size = parseInt(
      lineComment !== -1 ? line.substring(0, lineComment) : line,
      16
    );
    assert(_.isLength(size));

    if (size === 0) {
      const trailingHeaders = readHeaders(reader);

      assert(!reader.available());

      return { body: Buffer.concat(chunks), trailingHeaders };
    }

    chunks.push(reader.read(size));

    assert(reader.readLine().length === 0);
  }
};
