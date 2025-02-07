import ArchivedRequest from "./ArchivedRequest";
import assert from "assert";
import { compressGzip, decompressGzip } from "../util/encoding";
import { dropHash } from "../util/url";
import { readFileSync, writeFileSync } from "fs";
import {
  getRequestsDataFromRequests,
  getRequestsFromRequestsData,
} from "./requests";

export default class WPRArchive {
  constructor(
    readonly requests: ArchivedRequest[],
    readonly certs: any,
    readonly negotiatedProtocol: any,
    readonly deterministicTimeSeedMs: number,
    readonly serveResponseInChronologicalSequence: boolean,
    readonly currentSessionId: number,
    readonly disableFuzzyURLMatching: boolean
  ) {}

  getRequest(url: string, canUpgrade?: boolean): ArchivedRequest {
    url = dropHash(url);

    const { requests } = this;
    const req = requests.find((req) => req.url.toString() === url);
    if (req) {
      const res = req.response;
      const { statusCode } = res;
      if (statusCode >= 300 && statusCode <= 399) {
        const location = res.headers.get("location");
        assert(location);
        return this.getRequest(new URL(location, url).toString());
      } else {
        return req;
      }
    } else if (canUpgrade ?? false) {
      const newURL = new URL(url);
      if (newURL.protocol === "http:") {
        newURL.protocol = "https:";
        return this.getRequest(newURL.toString());
      }
    }

    throw new Error(`Cannot resolve request: ${url}`);
  }

  tryGetRequest(url: string, canUpgrade?: boolean): ArchivedRequest | null {
    try {
      return this.getRequest(url, canUpgrade);
    } catch {
      return null;
    }
  }

  editResponseBody(existingRequest: ArchivedRequest, body: Buffer): WPRArchive {
    const { requests } = this;
    const existingRequestIndex = requests.indexOf(existingRequest);
    assert(existingRequestIndex !== -1);
    return new WPRArchive(
      [
        ...requests.slice(0, existingRequestIndex),
        existingRequest.withResponse(existingRequest.response.withBody(body)),
        ...requests.slice(existingRequestIndex + 1),
      ],
      this.certs,
      this.negotiatedProtocol,
      this.deterministicTimeSeedMs,
      this.serveResponseInChronologicalSequence,
      this.currentSessionId,
      this.disableFuzzyURLMatching
    );
  }

  toObject(): any {
    return {
      Requests: getRequestsDataFromRequests(this.requests),
      Certs: this.certs,
      NegotiatedProtocol: this.negotiatedProtocol,
      DeterministicTimeSeedMs: this.deterministicTimeSeedMs,
      ServeResponseInChronologicalSequence:
        this.serveResponseInChronologicalSequence,
      CurrentSessionId: this.currentSessionId,
      DisableFuzzyURLMatching: this.disableFuzzyURLMatching,
    };
  }

  toFile(file: string): void {
    writeFileSync(
      file,
      compressGzip(Buffer.from(JSON.stringify(this.toObject())))
    );
  }

  static fromObject(data: any): WPRArchive {
    assert(typeof data === "object" && data !== null);

    const {
      Requests: requestsData,
      Certs: certsData,
      NegotiatedProtocol: negotiatedProtocolData,
      DeterministicTimeSeedMs: deterministicTimeSeedMsData,
      ServeResponseInChronologicalSequence:
        serveResponseInChronologicalSequenceData,
      CurrentSessionId: currentSessionIdData,
      DisableFuzzyURLMatching: disableFuzzyURLMatchingData,
    } = data;

    assert(typeof requestsData !== "undefined");
    const requests = getRequestsFromRequestsData(requestsData);
    assert(typeof certsData !== "undefined");
    assert(typeof negotiatedProtocolData !== "undefined");
    assert(typeof deterministicTimeSeedMsData === "number");
    assert(typeof serveResponseInChronologicalSequenceData === "boolean");
    assert(typeof currentSessionIdData === "number");
    assert(typeof disableFuzzyURLMatchingData === "boolean");

    return new WPRArchive(
      requests,
      certsData,
      negotiatedProtocolData,
      deterministicTimeSeedMsData,
      serveResponseInChronologicalSequenceData,
      currentSessionIdData,
      disableFuzzyURLMatchingData
    );
  }

  static fromFile(file: string): WPRArchive {
    return WPRArchive.fromObject(
      JSON.parse(decompressGzip(readFileSync(file)).toString())
    );
  }
}
