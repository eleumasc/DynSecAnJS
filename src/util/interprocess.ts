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

export const ipExec = async (
  filename: string,
  args: any[]
): Promise<Completion<any>> => {
  const childProcess = fork(filename);

  try {
    return await new Promise<Completion<any>>((resolve, reject) => {
      let responseReceived = false;

      childProcess.on("message", (message: IPMessage) => {
        responseReceived = true;

        childProcess.on("exit", () => {
          const { type } = message;
          if (type === "completion") {
            resolve(message.completion);
          } else if (type === "error") {
            reject(new Error(message.error));
          } else {
            reject(new Error("Protocol error"));
          }
        });
      });

      childProcess.on("error", (error) => {
        responseReceived = true;

        reject(error);
      });

      childProcess.on("exit", (code, signal) => {
        if (!responseReceived) {
          reject(
            new Error(`Process has exited prematurely [${code}, ${signal}]`)
          );
        }
      });

      childProcess.send({
        type: "request",
        args,
      } satisfies IPRequestMessage);
    });
  } finally {
    childProcess.kill();
  }
};

export const ipRegister = (
  callback: (...args: any[]) => Promise<any>
): void => {
  if (!process.send) return;

  process.once("message", async (message: IPMessage) => {
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
