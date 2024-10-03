import assert from "assert";
import { DetailedFlow } from "./DetailedFlow";

export const getEmptyFlows = (rawFlows: any): DetailedFlow[] => {
  assert(Array.isArray(rawFlows) && rawFlows.length === 0);
  return [];
};
