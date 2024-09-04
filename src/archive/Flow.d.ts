export interface Flow {
  source: { type: "cookie" } | { type: "localStorage"; key: string };
  sink: { type: "network"; targetUrl: string };
}
