import * as net from "net";

export interface Options {
  targetPort: number;
  targetHost?: string;
  serverPort?: number;
  serverHost?: string;
}

export const useTcpTunnel = async <T>(
  options: Options,
  cb: (address: net.AddressInfo) => Promise<T>
): Promise<T> => {
  const { targetHost, targetPort, serverHost, serverPort } = options;

  const sockets = new Set<net.Socket>();

  const server = net.createServer((clientSocket) => {
    const targetSocket = net.connect(targetPort, targetHost, () => {
      sockets.add(clientSocket);
      sockets.add(targetSocket);

      clientSocket.pipe(targetSocket);

      targetSocket.pipe(clientSocket);

      clientSocket.on("end", () => {
        sockets.delete(clientSocket);
        targetSocket.end();
      });

      targetSocket.on("end", () => {
        sockets.delete(targetSocket);
        clientSocket.end();
      });

      clientSocket.on("error", (err) => {
        targetSocket.end();
      });

      targetSocket.on("error", (err) => {
        clientSocket.end();
      });
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", (err) => reject(err));
      server.listen(serverPort, serverHost, () => resolve());
    });
    const address = server.address() as net.AddressInfo;
    return await cb(address);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      for (const socket of sockets) {
        socket.destroy();
      }
    });
  }
};
