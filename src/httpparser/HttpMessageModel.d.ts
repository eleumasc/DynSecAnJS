export type HeaderMap = Map<string, string[]>;

export interface HttpMessageModel {
  headLinePart0: string;
  headLinePart1: string;
  headLinePart2: string;
  headers: HeaderMap;
  body: Buffer;
}

export interface HttpRequestModel {
  method: string;
  target: string;
  protocolVersion: string;
  headers: HeaderMap;
  body: Buffer;
}

export interface HttpResponseModel {
  protocolVersion: string;
  statusCode: number;
  statusMessage: string;
  headers: HeaderMap;
  body: Buffer;
}
