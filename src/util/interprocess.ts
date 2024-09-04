import { Completion, toCompletion } from "./Completion";
import { fork } from "child_process";

export interface BaseIPMessage {
  type: string;
}

export interface IPRequestMessage extends BaseIPMessage {
  type: "request";
  args: any[];
}

export interface IPCompletionMessage extends BaseIPMessage {
  type: "completion";
  completion: Completion<any>;
}

export interface IPErrorMessage extends BaseIPMessage {
  type: "error";
  error: string;
}

export type IPMessage = IPRequestMessage | IPCompletionMessage | IPErrorMessage;

export const defaultTimeout = 10 * 60 * 1000; // 10 minutes

export const ipExec = async (
  filename: string,
  args: any[]
): Promise<Completion<any>> => {
  const childProcess = fork(filename, { timeout: defaultTimeout });

  try {
    return await new Promise<any>((res, rej) => {
      let settled = false;

      childProcess.on("message", (message: IPMessage) => {
        settled = true;
        const { type } = message;
        if (type === "completion") {
          res(message.completion);
        } else if (type === "error") {
          rej(new Error(message.error));
        } else {
          rej(new Error("Protocol error"));
        }
      });

      childProcess.on("error", (err) => {
        settled = true;
        rej(err);
      });

      childProcess.on("exit", (code) => {
        if (!settled) {
          rej(new Error(`Process has exited prematurely with code ${code}`));
        }
      });

      childProcess.send({ type: "request", args } satisfies IPRequestMessage);
    });
  } finally {
    await new Promise((resolve) => {
      childProcess.on("exit", resolve);

      childProcess.kill();
    });
  }
};

export const ipRegister = (
  callback: (...args: any[]) => Promise<any>
): void => {
  if (!process.send) return;

  process.on("message", async (message: IPMessage) => {
    const { type } = message;

    if (type === "request") {
      const completion = await toCompletion(() => callback(...message.args));
      process.send!({
        type: "completion",
        completion,
      } satisfies IPCompletionMessage);
    } else {
      process.send!({
        type: "error",
        error: "Protocol error",
      } satisfies IPErrorMessage);
    }
  });
};
