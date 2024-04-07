import Deferred from "../core/Deferred";
import { Fallible, isSuccess } from "../core/Fallible";
import { ChildProcess, Serializable } from "child_process";
import { timeBomb } from "../core/async";

interface IPCMessage {
  requestId: number;
}

interface IPCCall extends IPCMessage {
  command: string;
  args: any[];
}

interface IPCResponse extends IPCMessage {
  result: Fallible<any>;
}

export class IPCRuntimeError extends Error {
  constructor(readonly message: string) {
    super(message);
    this.name = IPCRuntimeError.name;
  }
}

export class IPCProtocolError extends Error {
  constructor(readonly message: string) {
    super(message);
    this.name = IPCProtocolError.name;
  }
}

export type IPCClientOnMessageListener = (response: IPCResponse) => void;

export class IPCClient {
  protected onMessageListener: IPCClientOnMessageListener;
  protected freshId = 1;
  protected deferredResponsesMap = new Map<number, Deferred<IPCResponse>>();

  constructor(readonly childProcess: ChildProcess) {
    this.onMessageListener = (response: IPCResponse) => {
      const { requestId } = response;
      const deferredResponse = this.deferredResponsesMap.get(requestId);
      if (!deferredResponse) {
        return;
      }
      deferredResponse.resolve(response);
    };
  }

  start() {
    this.childProcess.on("message", this.onMessageListener);
  }

  close() {
    this.childProcess.removeListener("message", this.onMessageListener);
  }

  async call(command: string, args: Serializable[]): Promise<any> {
    const requestId = this.freshId++;
    const deferredResponse = new Deferred<IPCResponse>();
    this.deferredResponsesMap.set(requestId, deferredResponse);
    this.childProcess.send(
      <IPCCall>{
        requestId,
        command,
        args,
      },
      (err) => {
        if (err) {
          deferredResponse.reject(err);
        }
      }
    );
    try {
      const { result } = await timeBomb(deferredResponse.promise, 15_000);
      if (isSuccess(result)) {
        return result.val;
      } else {
        throw new IPCRuntimeError(result.reason);
      }
    } finally {
      this.deferredResponsesMap.delete(requestId);
    }
  }
}

export type IPCServerHandler = (...args: any[]) => Promise<any>;

export type IPCServerOnMessageListener = (call: IPCCall) => Promise<void>;

export class IPCServer {
  protected onMessageListener: IPCServerOnMessageListener;

  constructor(readonly handlers: Record<string, IPCServerHandler>) {
    this.onMessageListener = async (call: IPCCall) => {
      const { requestId, command, args } = call;
      const handler = handlers[command];
      if (!handler) {
        throw new IPCProtocolError(
          `Handler for command '${command}' not found`
        );
      }
      try {
        const result = await handler(...args);
        process.send!(<IPCResponse>{
          requestId,
          result: {
            status: "success",
            val: result,
          },
        });
      } catch (e) {
        process.send!(<IPCResponse>{
          requestId,
          result: {
            status: "failure",
            reason: String(e),
          },
        });
      }
    };
  }

  start() {
    process.on("message", this.onMessageListener);
  }

  close() {
    process.removeListener("message", this.onMessageListener);
  }
}
