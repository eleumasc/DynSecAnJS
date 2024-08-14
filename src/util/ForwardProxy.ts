import { Server, Socket, connect } from "net";

import assert from "assert";
import { getTcpPort } from "./getTcpPort";
import { localhost } from "../env";
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

  const server = new Server(async (clientSocket: Socket) => {
    clientSocket.pause();
    assert(clientSocket.readableFlowing === false);

    clientSocket.on("error", () => {
      /* suppress */
    });

    let headerBuffer = Buffer.from([]);
    let headerEnd: number = -1;

    await new Promise<void>((resolve) => {
      const handleReadable = () => {
        let chunk;
        while (null !== (chunk = clientSocket.read())) {
          headerBuffer = Buffer.concat([headerBuffer, chunk]);
          headerEnd = headerBuffer.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            clientSocket.removeListener("readable", handleReadable);
            resolve();
            break;
          }
        }
      };

      clientSocket.on("readable", handleReadable);
    });

    assert(headerEnd !== -1);
    const headerString = headerBuffer.subarray(0, headerEnd).toString();

    if (/^CONNECT\s/i.test(headerString)) {
      const targetSocket = connect(httpsPort, hostname, () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");

        clientSocket.pipe(targetSocket);
        targetSocket.pipe(clientSocket);
      });

      targetSocket.on("close", () => {
        clientSocket.end();
      });

      clientSocket.on("close", () => {
        targetSocket.end();
      });
    } else {
      const targetSocket = connect(httpPort, hostname, () => {
        targetSocket.write(headerBuffer);

        clientSocket.pipe(targetSocket);
        targetSocket.pipe(clientSocket);
      });

      targetSocket.on("close", () => {
        clientSocket.end();
      });

      clientSocket.on("close", () => {
        targetSocket.end();
      });
    }
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
  }
};
