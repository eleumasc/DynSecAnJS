import { Socket } from "net";
import { delay } from "../core/async";
import { localhost } from "../env";

const MIN_PORT = 8000;
const MAX_PORT = 19999;

const reservedPorts = new Set<number>();

const randomPort = () => {
  return Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
};

export const getTcpPort = async (): Promise<number> => {
  let port: number;
  while (true) {
    port = randomPort();
    if (reservedPorts.has(port)) {
      continue;
    }
    reservedPorts.add(port);
    try {
      const portFree = await checkTcpPortFree(port);
      if (portFree) {
        break;
      }
    } finally {
      reservedPorts.delete(port);
    }
  }

  reservedPorts.add(port);
  setTimeout(() => {
    reservedPorts.delete(port);
  }, 15_000);

  return port;
};

export const checkTcpPortFree = (port: number): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    const socket = new Socket();

    socket.setTimeout(1000);

    socket.on("connect", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("error", (err: any) => {
      if (err.code === "ECONNREFUSED") {
        resolve(true);
      } else {
        reject(err);
      }
    });

    socket.connect(port, localhost);
  });
};

export const waitUntilFreeOrUsed =
  (free: boolean) =>
  async (
    port: number,
    retryTimeMs: number,
    timeoutMs: number
  ): Promise<void> => {
    const startTime = +new Date();
    while (+new Date() - startTime < timeoutMs) {
      const portFree = await checkTcpPortFree(port);
      if (free === portFree) {
        return;
      } else {
        delay(retryTimeMs);
      }
    }
    throw new Error(`Timeout after ${timeoutMs}ms`);
  };

export const waitUntilFree = waitUntilFreeOrUsed(true);

export const waitUntilUsed = waitUntilFreeOrUsed(false);
