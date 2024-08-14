import { compress, decompress } from "../core/compression";

import HeaderMap from "../httputil/HeaderMap";
import { HttpResponse } from "../httputil/HttpMessage";
import { buildHttpResponse } from "../httputil/buildHttp";
import { parseHttpResponse } from "../httputil/parseHttp";

export default interface ArchivedResponse {
  readonly protocolVersion: string;
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly headers: HeaderMap;
  readonly body: Buffer;

  withBody(body: Buffer): ArchivedResponse;
  serialize(): string;
}

export class OriginalArchivedResponse implements ArchivedResponse {
  protected _m: HttpResponse | null = null;
  protected _body: Buffer | null = null;

  constructor(protected readonly _serialized: string) {}

  get protocolVersion(): string {
    return this.m.protocolVersion;
  }

  get statusCode(): number {
    return this.m.statusCode;
  }

  get statusMessage(): string {
    return this.m.statusMessage;
  }

  get headers(): HeaderMap {
    return this.m.headers;
  }

  get body(): Buffer {
    if (this._body) {
      return this._body;
    }

    const { headers, body } = this.m;

    const encoding = headers.get("content-encoding");
    const decodedBody = encoding ? decompress(body, encoding) : body;

    return (this._body = decodedBody);
  }

  withBody(body: Buffer): ArchivedResponse {
    const { m } = this;

    return new ModifiedArchivedResponse(m, body);
  }

  serialize(): string {
    return this._serialized;
  }

  protected get m(): HttpResponse {
    if (this._m) {
      return this._m;
    }

    const model = parseHttpResponse(Buffer.from(this._serialized, "base64"));

    return (this._m = model);
  }
}

export class ModifiedArchivedResponse implements ArchivedResponse {
  constructor(
    protected readonly m: HttpResponse,
    protected readonly _body: Buffer
  ) {}

  get protocolVersion(): string {
    return this.m.protocolVersion;
  }

  get statusCode(): number {
    return this.m.statusCode;
  }

  get statusMessage(): string {
    return this.m.statusMessage;
  }

  get headers(): HeaderMap {
    return this.m.headers;
  }

  get body(): Buffer {
    return this._body;
  }

  withBody(body: Buffer): ArchivedResponse {
    const { m } = this;

    return new ModifiedArchivedResponse(m, body);
  }

  serialize(): string {
    const {
      protocolVersion,
      statusCode,
      statusMessage,
      headers,
      trailingHeaders,
    } = this.m;

    const encoding = headers.get("content-encoding");
    const encodedBody = encoding ? compress(this._body, encoding) : this._body;

    const model: HttpResponse = {
      protocolVersion,
      statusCode,
      statusMessage,
      headers: fixContentLength(headers, encodedBody),
      body: encodedBody,
      trailingHeaders,
    };

    return buildHttpResponse(model).toString("base64");
  }
}

const fixContentLength = (headers: HeaderMap, body: Buffer): HeaderMap => {
  if (headers.has("content-length")) {
    const fixedHeaders = headers.copy();
    fixedHeaders.set("content-length", body.length.toString());
    return fixedHeaders;
  } else {
    return headers;
  }
};
