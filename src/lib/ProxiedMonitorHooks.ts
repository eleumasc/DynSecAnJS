import {
  DnsLookupErrorListener,
  RequestListener,
  ResponseTransformer,
} from "./AnalysisProxy";

import { MonitorReport } from "./monitor";

export interface ProxiedMonitorHooks {
  reportCallback: (report: MonitorReport) => void;
  requestListener?: RequestListener;
  responseTransformer?: ResponseTransformer;
  dnsLookupErrorListener?: DnsLookupErrorListener;
}
