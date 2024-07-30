import { HeaderMap, HttpResponseModel } from "../httpparser/HttpMessageModel";

import { buildHttpResponse } from "../httpparser/buildHttp";
import { decodeResponseBody } from "../httpparser/decodeResponseBody";
import { encodeResponseBody } from "../httpparser/encodeResponseBody";
import { getSingleHeader } from "../httpparser/getSingleHeader";
import { parseHttpResponse } from "../httpparser/parseHttp";

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
  protected _m: HttpResponseModel | null = null;
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

    if (this.m.body.length === 0) {
      return (this._body = Buffer.alloc(0));
    }

    const body = decodeResponseBody(this.m);

    return (this._body = body);
  }

  withBody(body: Buffer): ArchivedResponse {
    const { m } = this;

    return new ModifiedArchivedResponse(m, body);
  }

  serialize(): string {
    return this._serialized;
  }

  protected get m(): HttpResponseModel {
    if (this._m) {
      return this._m;
    }

    const model = parseHttpResponse(Buffer.from(this._serialized, "base64"));

    return (this._m = model);
  }
}

export class ModifiedArchivedResponse implements ArchivedResponse {
  constructor(
    protected readonly m: HttpResponseModel,
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
    const { protocolVersion, statusCode, statusMessage } = this.m;

    const body = encodeResponseBody(
      this._body,
      getSingleHeader(this.m.headers, "content-encoding"),
      getSingleHeader(this.m.headers, "transfer-encoding")
    );

    const model: HttpResponseModel = {
      protocolVersion,
      statusCode,
      statusMessage,
      headers: new Map(this.m.headers).set("content-length", [
        body.length.toString(),
      ]),
      body,
    };

    return buildHttpResponse(model).toString("base64");
  }
}
