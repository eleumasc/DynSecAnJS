import { Completion } from "../util/Completion";

export type RecordSiteResult = Completion<RecordedSiteInfo>;

export interface RecordedSiteInfo {
  accessUrl: string;
  scriptUrls: string[];
}
