import _ from "lodash";
import { DetailedFlow } from "./DetailedFlow";

export interface Flow {
  source: DetailedFlow["source"];
  sink: { type: "network"; targetDomain: string };
  isExplicit: boolean;
  site: string;
}

export const uniqFlow = (flows: Flow[]) => _.uniqWith(flows, _.isEqual);
