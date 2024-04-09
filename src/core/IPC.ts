import Deferred from "./Deferred";
import { Fallible, isSuccess } from "./Fallible";
import { ChildProcess, Serializable } from "child_process";

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
  protected onExitListener: () => void;
  protected onErrorListener: (err: Error) => void;
  protected freshId = 1;
  protected deferredResponsesMap = new Map<number, Deferred<IPCResponse>>();
  protected error: Error | null = null;

  constructor(readonly childProcess: ChildProcess) {
    this.onMessageListener = (response) => {
      const { requestId } = response;
      const deferredResponse = this.deferredResponsesMap.get(requestId);
      if (!deferredResponse) {
        return;
      }
      deferredResponse.resolve(response);
    };
    this.onExitListener = () => {
      this.setError(new IPCProtocolError("Process has exited"));
    };
    this.onErrorListener = (err) => {
      this.setError(new IPCProtocolError(`Process error: ${err}`));
    };
  }

  start() {
    this.childProcess.on("message", this.onMessageListener);
    this.childProcess.on("exit", this.onExitListener);
    this.childProcess.on("error", this.onErrorListener);
  }

  close() {
    this.childProcess.removeListener("message", this.onMessageListener);
    this.childProcess.removeListener("exit", this.onExitListener);
    this.childProcess.removeListener("error", this.onErrorListener);
  }

  async call(command: string, args: Serializable[]): Promise<any> {
    if (this.error) {
      throw this.error;
    }

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
      const { result } = await deferredResponse.promise;
      if (isSuccess(result)) {
        return result.val;
      } else {
        throw new IPCRuntimeError(result.reason);
      }
    } finally {
      this.deferredResponsesMap.delete(requestId);
    }
  }

  protected setError(err: Error) {
    this.error = err;
    for (const deferredResponse of this.deferredResponsesMap.values()) {
      deferredResponse.reject(err);
    }
    this.deferredResponsesMap.clear();
  }
}

export type IPCServerHandler = (...args: any[]) => Promise<any>;

export type IPCServerOnMessageListener = (call: IPCCall) => Promise<void>;

export class IPCServer {
  protected onMessageListener: IPCServerOnMessageListener;

  constructor(readonly handlers: Record<string, IPCServerHandler>) {
    this.onMessageListener = async (call) => {
      const { requestId, command, args } = call;
      try {
        const handler = handlers[command];
        if (!handler) {
          throw new IPCProtocolError(
            `Handler for command '${command}' not found`
          );
        }
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
