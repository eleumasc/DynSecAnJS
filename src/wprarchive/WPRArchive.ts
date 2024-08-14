import { compressGzip, decompressGzip } from "../core/compression";
import {
  getRequestsDataFromRequests,
  getRequestsFromRequestsData,
} from "./requests";
import { readFileSync, writeFileSync } from "fs";

import ArchivedRequest from "./ArchivedRequest";
import ArchivedResponse from "./ArchivedResponse";
import assert from "assert";

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

  editResponses(
    callback: (
      request: ArchivedRequest,
      archive: WPRArchive
    ) => ArchivedResponse
  ): WPRArchive {
    return new WPRArchive(
      this.requests.map((request) =>
        request.withResponse(callback(request, this))
      ),
      this.certs,
      this.negotiatedProtocol,
      this.deterministicTimeSeedMs,
      this.serveResponseInChronologicalSequence,
      this.currentSessionId,
      this.disableFuzzyURLMatching
    );
  }

  toData(): any {
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
      compressGzip(Buffer.from(JSON.stringify(this.toData())))
    );
  }

  static fromData(data: any): WPRArchive {
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
    return WPRArchive.fromData(
      JSON.parse(decompressGzip(readFileSync(file)).toString())
    );
  }
}
