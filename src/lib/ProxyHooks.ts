import Deferred from "./util/Deferred";
import { RequestListener, ResponseTransformer } from "./AnalysisProxy";

export interface ProxyHooks {
  reportCallback: (data: any) => void;
  requestListener?: RequestListener;
  responseTransformer?: ResponseTransformer;
}

export type ProxyHooksProvider<T> = (
  willCompleteAnalysis: Deferred<T>
) => ProxyHooks;
