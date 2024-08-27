import assert from "assert";
import { fork } from "child_process";

export interface IPCallbackEntry {
  name: string;
  fn: (...args: any[]) => any;
}

interface BaseIPMessage {
  type: string;
}

interface CallIPMessage extends BaseIPMessage {
  type: "call";
  name: string;
  args: unknown[];
}

interface SuccessIPMessage extends BaseIPMessage {
  type: "success";
  value: unknown;
}

interface FailureIPMessage extends BaseIPMessage {
  type: "failure";
  error: string;
}

type IPMessage = CallIPMessage | SuccessIPMessage | FailureIPMessage;

export const isChildProcess = process.send !== undefined;

export const registerIPCallback = (
  entriesFactory: () => IPCallbackEntry[]
): void => {
  const entries = entriesFactory();

  process.on("message", async (message: IPMessage) => {
    try {
      if (message.type === "call") {
        const { name, args } = message;
        const entry = entries.find(({ name: entryName }) => entryName === name);
        assert(entry, `Entry not found: ${name}`);
        const value = await entry.fn.apply(null, args);
        process.send!({ type: "success", value } satisfies SuccessIPMessage);
      } else {
        throw new Error("Protocol error");
      }
    } catch (e) {
      process.send!({
        type: "failure",
        error: e instanceof Error ? String(e.stack) : String(e),
      } satisfies FailureIPMessage);
    }
  });
};

export const callIPCallback = async <T>(
  modulePath: string,
  name: string,
  ...args: unknown[]
): Promise<T> => {
  const childProcess = fork(modulePath);

  try {
    return await new Promise<T>((resolve, reject) => {
      childProcess.on("message", (message: IPMessage) => {
        if (message.type === "success") {
          resolve(message.value as T);
        } else if (message.type === "failure") {
          reject(new Error(message.error));
        } else {
          reject(new Error("Protocol error"));
        }
      });

      childProcess.on("exit", (code, signal) => {
        if (code !== null || signal !== "SIGINT") {
          reject(
            new Error(`Process has exited prematurely [${code}, ${signal}]`)
          );
        }
      });

      childProcess.send({ type: "call", name, args } satisfies CallIPMessage);
    });
  } finally {
    childProcess.kill("SIGINT");
  }
};
