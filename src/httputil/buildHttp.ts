import { HttpMessage, HttpRequest, HttpResponse } from "./HttpMessage";

import { CRLF } from "./consts";
import HeaderMap from "./HeaderMap";
import assert from "assert";

export const buildHttpRequest = (model: HttpRequest): Buffer => {
  const { method, target, protocolVersion, headers, body, trailingHeaders } =
    model;

  return buildHttpMessage({
    headLine0: method,
    headLine1: target,
    headLine2: protocolVersion,
    headers,
    body,
    trailingHeaders,
  });
};

export const buildHttpResponse = (model: HttpResponse): Buffer => {
  const {
    protocolVersion,
    statusCode,
    statusMessage,
    headers,
    body,
    trailingHeaders,
  } = model;

  return buildHttpMessage({
    headLine0: protocolVersion,
    headLine1: statusCode.toString(),
    headLine2: statusMessage,
    headers,
    body,
    trailingHeaders,
  });
};

const buildHttpMessage = (model: HttpMessage): Buffer => {
  const { headLine0: headLinePart0, headLine1: headLinePart1, headLine2: headLinePart2, headers } = model;

  return Buffer.concat([
    Buffer.from(`${headLinePart0} ${headLinePart1} ${headLinePart2}`),
    CRLF,
    buildHeaders(headers),
    CRLF,
    buildBody(model),
  ]);
};

const buildBody = (model: HttpMessage): Buffer => {
  const { headers, body, trailingHeaders } = model;

  const len = headers.get("content-length");
  const encoding = headers.get("content-encoding");
  const transferEncoding = headers.get("transfer-encoding");

  if (transferEncoding !== undefined) {
    assert(transferEncoding === "chunked");
    assert(encoding === undefined);
    assert(len === undefined);

    return Buffer.concat(
      [
        Buffer.from(`${body.length.toString(16)}`),
        body,
        Buffer.from("0"),
        buildHeaders(trailingHeaders),
      ].flatMap((part) => [part, CRLF])
    );
  } else {
    return body;
  }
};

const buildHeaders = (headers: HeaderMap): Buffer => {
  return Buffer.concat(
    [...headers]
      .map((header) => Buffer.from(`${header[0]}: ${header[1]}`))
      .flatMap((line) => [line, CRLF])
  );
};
