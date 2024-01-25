import {
  AssessmentLogfileRecord,
  AssessmentLogfileRecordData,
} from "./AssessmentSession";
import { TestLogfileRecord, TestLogfileRecordData } from "./TestSession";

export interface Logfile {
  site: string;
  record: LogfileRecord;
}

export interface LogfileData {
  site: string;
  record: LogfileRecordData;
}

export const serializeLogfile = (concrete: Logfile): LogfileData => {
  const { site, record } = concrete;
  return {
    site,
    record: record.serialize(),
  };
};

export const deserializeLogfile = (data: LogfileData): Logfile => {
  const { site, record } = data;
  return {
    site,
    record: deserializeLogfileRecord(record),
  };
};

export interface LogfileRecord {
  serialize(): LogfileRecordData;
}

export interface LogfileRecordData {
  type: string;
}

export const deserializeLogfileRecord = (
  data: LogfileRecordData
): LogfileRecord => {
  const { type } = data;
  switch (type) {
    case "TestLogfileRecord":
      return TestLogfileRecord.deserialize(data as TestLogfileRecordData);
    case "AssessmentLogfileRecord":
      return AssessmentLogfileRecord.deserialize(
        data as AssessmentLogfileRecordData
      );
    default:
      throw new Error(`Unsupported type of LogfileRecord: ${type}`);
  }
};
