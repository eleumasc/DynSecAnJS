import _ from "lodash";
import { DetailedFlow } from "./DetailedFlow";

export interface Flow {
  source: { type: DetailedFlow["source"]["type"] };
  sink: { type: "network"; targetDomain: string };
  site: string;
}

export const uniqFlow = (flows: Flow[]) => _.uniqWith(flows, _.isEqual);
