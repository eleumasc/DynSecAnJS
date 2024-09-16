import { CompactLabel } from "./compact-label";
import { expandLabel, Label } from "./label";
import { validateRecordOfString } from "./helpers";

interface AnalysisLabel<Info extends any> extends Label {
  info: Info;
}

type CookieSourceLabel = AnalysisLabel<ValueInfo>;

const SOURCE_DOCUMENT_COOKIE = "document.cookie_1";

function isCookieSourceLabel(label: Label): label is CookieSourceLabel {
  return label.type === SOURCE_DOCUMENT_COOKIE;
}

export { CookieSourceLabel, isCookieSourceLabel };

type CurrentUrlSourceLabel = AnalysisLabel<ValueInfo>;

const SOURCE_DOCUMENT_URL = "document.URL";
const SOURCE_LOCATION = "location";

function isCurrentUrlSourceLabel(label: Label): label is CurrentUrlSourceLabel {
  const type = label.type;
  return type === SOURCE_DOCUMENT_URL || type === SOURCE_LOCATION;
}

export { CurrentUrlSourceLabel, isCurrentUrlSourceLabel };

type NavigatorSourceLabel = AnalysisLabel<ValueInfo>;

const SOURCE_NAVIGATOR_LANGUAGE = "navigator.language";
const SOURCE_NAVIGATOR_PLATFORM = "navigator.platform";
const SOURCE_NAVIGATOR_USERAGENT = "navigator.userAgent";

function isNavigatorSourceLabel(label: Label): label is NavigatorSourceLabel {
  const type = label.type;
  return (
    type === SOURCE_NAVIGATOR_LANGUAGE ||
    type === SOURCE_NAVIGATOR_PLATFORM ||
    type === SOURCE_NAVIGATOR_USERAGENT
  );
}

export { NavigatorSourceLabel, isNavigatorSourceLabel };

type NetworkSourceLabel = AnalysisLabel<UrlInfo>;

const SOURCE_XMLHTTPREQUEST = "XMLHttpRequest_1";
const SOURCE_FETCH = "fetch_1";

function isNetworkSourceLabel(label: Label): label is NetworkSourceLabel {
  const type = label.type;
  return type === SOURCE_XMLHTTPREQUEST || type === SOURCE_FETCH;
}

export { NetworkSourceLabel, isNetworkSourceLabel };

type StorageSourceLabel = AnalysisLabel<StorageSourceInfo>;

const SOURCE_LOCALSTORAGE_GETITEM = "localStorage.getItem";
const SOURCE_SESSIONSTORAGE_GETITEM = "sessionStorage.getItem";

function isStorageSourceLabel(label: Label): label is StorageSourceLabel {
  const type = label.type;
  return (
    type === SOURCE_LOCALSTORAGE_GETITEM ||
    type === SOURCE_SESSIONSTORAGE_GETITEM
  );
}

export { StorageSourceLabel, isStorageSourceLabel };

type SourceLabel =
  | CookieSourceLabel
  | CurrentUrlSourceLabel
  | NavigatorSourceLabel
  | NetworkSourceLabel
  | StorageSourceLabel;

function isSourceLabel(label: Label): label is SourceLabel {
  return (
    isCookieSourceLabel(label) ||
    isCurrentUrlSourceLabel(label) ||
    isNavigatorSourceLabel(label) ||
    isNetworkSourceLabel(label) ||
    isStorageSourceLabel(label)
  );
}

export { SourceLabel, isSourceLabel };

type CookieSinkLabel = AnalysisLabel<ValueInfo>;

const SINK_DOCUMENT_COOKIE = "document.cookie_2";

function isCookieSinkLabel(label: Label): label is CookieSinkLabel {
  return label.type === SINK_DOCUMENT_COOKIE;
}

export { CookieSinkLabel, isCookieSinkLabel };

type NetworkSinkLabel = AnalysisLabel<UrlInfo>;

const SINK_XMLHTTPREQUEST = "XMLHttpRequest_2";
const SINK_FETCH = "fetch_2";
const SINK_NAVIGATOR_SENDBEACON = "navigator.sendBeacon";
const SINK_HTMLELEMENT_SRC = "HTMLElement[src]";

function isNetworkSinkLabel(label: Label): label is NetworkSinkLabel {
  const type = label.type;
  return (
    type === SINK_XMLHTTPREQUEST ||
    type === SINK_FETCH ||
    type === SINK_NAVIGATOR_SENDBEACON ||
    type === SINK_HTMLELEMENT_SRC
  );
}

export { NetworkSinkLabel, isNetworkSinkLabel };

type StorageSinkLabel = AnalysisLabel<StorageSinkInfo>;

const SINK_LOCALSTORAGE_SETITEM = "localStorage.setItem";
const SINK_SESSIONSTORAGE_SETITEM = "sessionStorage.setItem";

function isStorageSinkLabel(label: Label): label is StorageSinkLabel {
  const type = label.type;
  return (
    type === SINK_LOCALSTORAGE_SETITEM || type === SINK_SESSIONSTORAGE_SETITEM
  );
}

export { StorageSinkLabel, isStorageSinkLabel };

type SinkLabel = CookieSinkLabel | NetworkSinkLabel | StorageSinkLabel;

function isSinkLabel(label: Label): label is SinkLabel {
  return (
    isCookieSinkLabel(label) ||
    isNetworkSinkLabel(label) ||
    isStorageSinkLabel(label)
  );
}

export { SinkLabel, isSinkLabel };

type CookieLabel = CookieSourceLabel | CookieSinkLabel;

function isCookieLabel(label: Label): label is CookieLabel {
  return isCookieSourceLabel(label) || isCookieSinkLabel(label);
}

export { CookieLabel, isCookieLabel };

type CurrentUrlLabel = CurrentUrlSourceLabel;

function isCurrentUrlLabel(label: Label): label is CurrentUrlLabel {
  return isCurrentUrlSourceLabel(label);
}

export { CurrentUrlLabel, isCurrentUrlLabel };

type NavigatorLabel = NavigatorSourceLabel;

function isNavigatorLabel(label: Label): label is NavigatorLabel {
  return isNavigatorSourceLabel(label);
}

export { NavigatorLabel, isNavigatorLabel };

type NetworkLabel = NetworkSourceLabel | NetworkSinkLabel;

function isNetworkLabel(label: Label): label is NetworkLabel {
  return isNetworkSourceLabel(label) || isNetworkSinkLabel(label);
}

export { NetworkLabel, isNetworkLabel };

type StorageLabel = StorageSourceLabel | StorageSinkLabel;

function isStorageLabel(label: Label): label is StorageLabel {
  return isStorageSourceLabel(label) || isStorageSinkLabel(label);
}

export { StorageLabel, isStorageLabel };

interface ValueInfo {
  value: string;
}

type _CompactValueInfo = {
  value: string;
};

function _validateCompactValueInfo(compact: any): compact is _CompactValueInfo {
  return validateRecordOfString(compact) && typeof compact.value === "string";
}

function _createExpandValueInfo(): (compact: _CompactValueInfo) => ValueInfo {
  return (compact) => compact;
}

interface UrlInfo {
  url: string;
}

type _CompactUrlInfo = { url: string };

function _validateCompactUrlInfo(compact: any): compact is _CompactUrlInfo {
  return validateRecordOfString(compact) && typeof compact.url === "string";
}

function _createExpandUrlInfo(): (compact: _CompactUrlInfo) => UrlInfo {
  return (compact) => ({ url: compact.url });
}

interface StorageSourceInfo {
  key: string;
  value: string;
  ownership: string | null;
}

type _CompactStorageSourceInfo = {
  key: string;
  value: string;
  ownership: string;
};

function _validateCompactStorageSourceInfo(
  compact: any
): compact is _CompactStorageSourceInfo {
  return (
    validateRecordOfString(compact) &&
    typeof compact.key === "string" &&
    typeof compact.value === "string" &&
    typeof compact.ownership === "string"
  );
}

function _createExpandStorageSourceInfo(): (
  compact: _CompactStorageSourceInfo
) => StorageSourceInfo {
  return (compact) => ({
    key: compact.key,
    value: compact.value,
    ownership: compact.ownership || null,
  });
}

interface StorageSinkInfo {
  key: string;
  value: string;
}

type _CompactStorageSinkInfo = {
  key: string;
  value: string;
};

function _validateCompactStorageSinkInfo(
  compact: any
): compact is _CompactStorageSinkInfo {
  return (
    validateRecordOfString(compact) &&
    typeof compact.key === "string" &&
    typeof compact.value === "string"
  );
}

function _createExpandStorageSinkInfo(): (
  compact: _CompactStorageSinkInfo
) => StorageSinkInfo {
  return (compact) => ({
    key: compact.key,
    value: compact.value,
  });
}

function expandAnalysisLabel(compact: CompactLabel): Label {
  switch (compact.type) {
    case SOURCE_DOCUMENT_COOKIE:
    case SOURCE_DOCUMENT_URL:
    case SOURCE_LOCATION:
    case SOURCE_NAVIGATOR_LANGUAGE:
    case SOURCE_NAVIGATOR_PLATFORM:
    case SOURCE_NAVIGATOR_USERAGENT:
      return expandLabel(
        compact,
        _validateCompactValueInfo,
        _createExpandValueInfo()
      );
    case SOURCE_XMLHTTPREQUEST:
    case SOURCE_FETCH:
      return expandLabel(
        compact,
        _validateCompactUrlInfo,
        _createExpandUrlInfo()
      );
    case SOURCE_LOCALSTORAGE_GETITEM:
    case SOURCE_SESSIONSTORAGE_GETITEM:
      return expandLabel(
        compact,
        _validateCompactStorageSourceInfo,
        _createExpandStorageSourceInfo()
      );
    case SINK_DOCUMENT_COOKIE:
      return expandLabel(
        compact,
        _validateCompactValueInfo,
        _createExpandValueInfo()
      );
    case SINK_XMLHTTPREQUEST:
    case SINK_FETCH:
    case SINK_NAVIGATOR_SENDBEACON:
      return expandLabel(
        compact,
        _validateCompactUrlInfo,
        _createExpandUrlInfo()
      );
    case SINK_HTMLELEMENT_SRC:
      return expandLabel(compact, _validateCompactValueInfo, (compact) =>
        _createExpandUrlInfo()({ url: compact.value })
      );
    case SINK_LOCALSTORAGE_SETITEM:
    case SINK_SESSIONSTORAGE_SETITEM:
      return expandLabel(
        compact,
        _validateCompactStorageSinkInfo,
        _createExpandStorageSinkInfo()
      );
  }
  throw new Error(`Unsupported analysis label: ${compact.type}`);
}

export { expandAnalysisLabel };
