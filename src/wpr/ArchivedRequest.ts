import ArchivedResponse from "./ArchivedResponse";
import HeaderMap from "../httpparser/HeaderMap";
import { HttpRequest } from "../httpparser/HttpMessage";
import { parseHttpRequest } from "../httpparser/parseHttp";

export default interface ArchivedRequest {
  readonly _host: string;
  readonly _ustr: string;
  readonly method: string;
  readonly url: URL;
  readonly protocolVersion: string;
  readonly headers: HeaderMap;
  readonly response: ArchivedResponse;
  readonly lastServedSessionId: number;

  withResponse(response: ArchivedResponse): ArchivedRequest;
  serialize(): string;
}

export class BasicArchivedRequest implements ArchivedRequest {
  protected _m: HttpRequest | null = null;

  constructor(
    protected readonly _serialized: string,
    readonly _host: string,
    readonly _ustr: string,
    readonly url: URL,
    readonly response: ArchivedResponse,
    readonly lastServedSessionId: number
  ) {}

  get method(): string {
    return this.m.method;
  }

  get protocolVersion(): string {
    return this.m.protocolVersion;
  }

  get headers(): HeaderMap {
    return this.m.headers;
  }

  withResponse(response: ArchivedResponse): ArchivedRequest {
    return new BasicArchivedRequest(
      this._serialized,
      this._host,
      this._ustr,
      this.url,
      response,
      this.lastServedSessionId
    );
  }

  serialize(): string {
    return this._serialized;
  }

  protected get m(): HttpRequest {
    if (this._m) {
      return this._m;
    }

    const model = parseHttpRequest(Buffer.from(this._serialized, "base64"));

    return (this._m = model);
  }
}
