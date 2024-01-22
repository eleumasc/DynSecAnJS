import { Mockttp as MockttpServer } from "mockttp";
import { lookup as dnsLookup } from "dns/promises";

export class VirusProxy {
  constructor(readonly server: MockttpServer) {}

  port(): number {
    return this.server.port;
  }

  async terminate(): Promise<void> {
    await this.server.stop();
  }

  static async create(
    server: MockttpServer,
    transform: (body: string) => Promise<string>
  ): Promise<VirusProxy> {
    server.forAnyRequest().thenPassThrough({
      async beforeRequest(req) {
        try {
          await dnsLookup(new URL(req.url).hostname);
        } catch (e) {
          return {
            response: {
              statusCode: 500,
              body: (e as Error).message, // TODO: failure
            },
          };
        }
      },

      async beforeResponse(res) {
        const { statusCode, statusMessage, headers, body } = res;

        if (!headers["content-type"]?.includes("html")) {
          return;
        }

        const originalBodyText = await body.getText();
        if (!originalBodyText) {
          return;
        }

        const transformedBodyText = await transform(originalBodyText);
        return {
          statusCode,
          statusMessage,
          headers: {
            ...headers,
            "content-length": undefined,
            "content-security-policy": undefined, // disable Content Security Policy (CSP)
            "content-security-policy-report-only": undefined, // disable Content Security Policy (CSP)
          },
          body: transformedBodyText,
        };
      },
    });

    await server.start();

    return new VirusProxy(server);
  }
}

export const useVirusProxy = async <T>(
  server: MockttpServer,
  transform: (body: string) => Promise<string>,
  cb: (virusProxy: VirusProxy) => Promise<T>
): Promise<T> => {
  const virusProxy = await VirusProxy.create(server, transform);
  try {
    return await cb(virusProxy);
  } finally {
    await virusProxy.terminate();
  }
};
