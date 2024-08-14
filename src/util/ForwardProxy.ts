import { createServer as createHttpServer, request } from "http";

import { connect } from "net";
import { getTcpPort } from "../core/net";
import { localhost } from "../core/env";
import { promisify } from "util";

export interface ForwardProxy {
  hostname: string;
  port: number;
}

export const useForwardProxy = async <T>(
  options: {
    hostname: string;
    httpPort: number;
    httpsPort: number;
  },
  use: (instance: ForwardProxy) => Promise<T>
): Promise<T> => {
  const { hostname, httpPort, httpsPort } = options;

  const proxyHostname = localhost;
  const proxyPort = await getTcpPort();

  const server = createHttpServer((req, res) => {
    const proxyReq = request(
      {
        hostname,
        port: httpPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode!, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    req.pipe(proxyReq, { end: true });
  });

  server.on("connect", (_, clientSocket, head) => {
    const serverSocket = connect(httpsPort, hostname, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");

      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on("error", (err) => {
      clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`);
    });

    clientSocket.on("error", (err) => {
      serverSocket.end();
    });
  });

  server.listen(proxyPort, proxyHostname);

  try {
    return await use({
      hostname: proxyHostname,
      port: proxyPort,
    });
  } finally {
    await promisify<void>((callback) => {
      server.close(callback);
    })();
    server.closeAllConnections();
  }
};
