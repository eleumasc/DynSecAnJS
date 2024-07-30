import { CRLF, SPACE } from "./consts";
import {
  HttpMessageModel,
  HttpRequestModel,
  HttpResponseModel,
} from "./HttpMessageModel";

export const buildHttpRequest = (model: HttpRequestModel): Buffer => {
  const { method, target, protocolVersion, headers, body } = model;

  return buildHttpMessage({
    headLinePart0: method,
    headLinePart1: target,
    headLinePart2: protocolVersion,
    headers,
    body,
  });
};

export const buildHttpResponse = (model: HttpResponseModel): Buffer => {
  const { protocolVersion, statusCode, statusMessage, headers, body } = model;

  return buildHttpMessage({
    headLinePart0: protocolVersion,
    headLinePart1: statusCode.toString(),
    headLinePart2: statusMessage,
    headers,
    body,
  });
};

const buildHttpMessage = (model: HttpMessageModel): Buffer => {
  const { headLinePart0, headLinePart1, headLinePart2, headers, body } = model;

  return Buffer.concat([
    Buffer.from(headLinePart0, "ascii"),
    SPACE,
    Buffer.from(headLinePart1, "ascii"),
    SPACE,
    Buffer.from(headLinePart2, "ascii"),
    CRLF,
    ...[...headers].flatMap(([key, values]) => {
      const keyBuffer = Buffer.from(key, "ascii");
      return values.flatMap((value) => {
        return [keyBuffer, SPACE, Buffer.from(value, "ascii"), CRLF];
      });
    }),
    CRLF,
    body,
  ]);
};
