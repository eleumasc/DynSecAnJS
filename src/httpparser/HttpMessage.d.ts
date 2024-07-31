import HeaderMap from "./HeaderMap";

export interface HttpMessage {
  headLine0: string;
  headLine1: string;
  headLine2: string;
  headers: HeaderMap;
  body: Buffer;
  trailingHeaders: HeaderMap;
}

export interface HttpRequest {
  method: string;
  target: string;
  protocolVersion: string;
  headers: HeaderMap;
  body: Buffer;
  trailingHeaders: HeaderMap;
}

export interface HttpResponse {
  protocolVersion: string;
  statusCode: number;
  statusMessage: string;
  headers: HeaderMap;
  body: Buffer;
  trailingHeaders: HeaderMap;
}
