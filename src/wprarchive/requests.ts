import ArchivedRequest, { BasicArchivedRequest } from "./ArchivedRequest";

import { OriginalArchivedResponse } from "./ArchivedResponse";
import _ from "lodash";
import assert from "assert";

export const getRequestsDataFromRequests = (
  requests: ArchivedRequest[]
): any => {
  return _.mapValues(_.groupBy(requests, "_host"), (hostRequests) =>
    _.mapValues(_.groupBy(hostRequests, "_ustr"), (ustrRequests) =>
      ustrRequests.map((request) => {
        return {
          SerializedRequest: request.serialize(),
          SerializedResponse: request.response.serialize(),
          LastServedSessionId: request.lastServedSessionId,
        };
      })
    )
  );
};

export const getRequestsFromRequestsData = (
  requestsData: any
): ArchivedRequest[] => {
  return [...getRequestsFromHostRecord(requestsData)];
};

function* getRequestsFromHostRecord(
  hostRecord: any
): Generator<ArchivedRequest> {
  assert(typeof hostRecord === "object" && hostRecord !== null);

  for (const [host, ustrRecord] of Object.entries(hostRecord)) {
    yield* getRequestsFromUstrRecord(ustrRecord, host);
  }
}

function* getRequestsFromUstrRecord(
  ustrRecord: any,
  host: string
): Generator<ArchivedRequest> {
  assert(typeof ustrRecord === "object" && ustrRecord !== null);

  for (const [ustr, requestRecords] of Object.entries(ustrRecord)) {
    yield* getRequestsFromRequestRecords(
      requestRecords,
      host,
      ustr,
      new URL(ustr)
    );
  }
}

function* getRequestsFromRequestRecords(
  requestRecords: any,
  host: string,
  ustr: string,
  url: URL
): Generator<ArchivedRequest> {
  assert(Array.isArray(requestRecords));

  for (const requestRecord of requestRecords) {
    yield createRequestFromRequestRecord(requestRecord, host, ustr, url);
  }
}

const createRequestFromRequestRecord = (
  requestRecord: any,
  host: string,
  ustr: string,
  url: URL
): ArchivedRequest => {
  assert(typeof requestRecord === "object" && requestRecord !== null);

  const {
    SerializedRequest: serializedRequest,
    SerializedResponse: serializedResponse,
    LastServedSessionId: lastServedSessionId,
  } = requestRecord;

  assert(typeof serializedRequest === "string");
  assert(typeof serializedResponse === "string");
  assert(typeof lastServedSessionId === "number");

  return new BasicArchivedRequest(
    serializedRequest,
    host,
    ustr,
    url,
    new OriginalArchivedResponse(serializedResponse),
    lastServedSessionId
  );
};
