import { CHR_COLON, CHR_SPACE, CRLF, DBLCRLF } from "./consts";
import {
  HeaderMap,
  HttpMessageModel,
  HttpRequestModel,
  HttpResponseModel,
} from "./HttpMessageModel";

import _ from "lodash";
import assert from "assert";

export const parseHttpRequest = (input: Buffer): HttpRequestModel => {
  const { headLinePart0, headLinePart1, headLinePart2, headers, body } =
    parseHttpMessage(input);

  return {
    method: headLinePart0.toUpperCase(),
    target: headLinePart1,
    protocolVersion: headLinePart2.toUpperCase(),
    headers,
    body,
  };
};

export const parseHttpResponse = (input: Buffer): HttpResponseModel => {
  const { headLinePart0, headLinePart1, headLinePart2, headers, body } =
    parseHttpMessage(input);

  const statusCode = _.toInteger(headLinePart1);
  assert(!_.isNaN(statusCode) && statusCode >= 100 && statusCode <= 599);

  return {
    protocolVersion: headLinePart0.toUpperCase(),
    statusCode,
    statusMessage: headLinePart2,
    headers,
    body,
  };
};

const parseHttpMessage = (input: Buffer): HttpMessageModel => {
  const [head, body] = bufSplit(input, DBLCRLF, 2);
  assert(head && body);

  const [headLine, ...tailLines] = bufSplit(head, CRLF);
  assert(headLine);

  const [headLinePart0, headLinePart1, headLinePart2] = getHeadLineParts(
    headLine.toString("ascii")
  );

  const headers: HeaderMap = tailLines
    .map((headerLine): [string, string] =>
      getHeaderParts(headerLine.toString("ascii"))
    )
    .reduce((headers, [key, value]) => {
      const k = key.toLowerCase();
      const values = headers.get(k) || [];
      if (values.length === 0) {
        headers.set(k, values);
      }
      values.push(value);
      return headers;
    }, new Map());

  return {
    headLinePart0,
    headLinePart1,
    headLinePart2,
    headers,
    body,
  };
};

const getHeadLineParts = (s: string): [string, string, string] => {
  const s0 = s.trimStart();

  const e0 = s0.indexOf(CHR_SPACE);
  assert(e0 !== -1);
  const part0 = s0.substring(0, e0);

  const s1 = s0.substring(e0).trimStart();

  const e1 = s1.indexOf(CHR_SPACE);
  assert(e1 !== -1);
  const part1 = s1.substring(0, e1);

  const part2 = s1.substring(e1).trim();
  assert(part2.length > 0);

  return [part0, part1, part2];
};

const getHeaderParts = (s: string): [string, string] => {
  const e0 = s.indexOf(CHR_COLON);
  assert(e0 !== -1);

  const key = s.substring(0, e0).trim();
  const value = s.substring(e0 + 1).trim();
  assert(value.length > 0);

  return [key, value];
};

const bufSplit = (input: Buffer, separator: Buffer, limit?: number) => {
  limit = _.defaultTo(limit, Infinity);
  assert(limit > 0);
  limit -= 1;

  const result: Buffer[] = [];
  let i = 0;
  for (
    let j;
    result.length < limit && (j = input.indexOf(separator, i)) !== -1;
    i = j + separator.length
  ) {
    result.push(input.subarray(i, j));
  }
  result.push(input.subarray(i));
  return result;
};
