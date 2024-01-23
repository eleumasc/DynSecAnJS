type Resolver<T> = (value: T) => void;
type Rejecter = (reason?: any) => void;

interface BaseDeferredState {
  type: string;
}

interface PendingDeferredState<T> extends BaseDeferredState {
  type: "pending";
  resolvers: Resolver<T>[];
  rejecters: Rejecter[];
}

interface FulfilledDeferredState<T> extends BaseDeferredState {
  type: "fulfilled";
  value: T;
}

interface RejectedDeferredState extends BaseDeferredState {
  type: "rejected";
  reason: any;
}

type DeferredState<T> =
  | PendingDeferredState<T>
  | FulfilledDeferredState<T>
  | RejectedDeferredState;

export default class Deferred<T> {
  private state: DeferredState<T>;

  constructor() {
    this.state = {
      type: "pending",
      resolvers: [],
      rejecters: [],
    };
  }

  get promise(): Promise<T> {
    const { type } = this.state;
    switch (type) {
      case "pending": {
        const { resolvers, rejecters } = this.state;
        const promise = new Promise<T>((resolve, reject) => {
          this.state = {
            type: "pending",
            resolvers: [...resolvers, resolve],
            rejecters: [...rejecters, reject],
          };
        });
        return promise;
      }
      case "fulfilled": {
        const { value } = this.state;
        return Promise.resolve(value);
      }
      case "rejected": {
        const { reason } = this.state;
        return Promise.reject(reason);
      }
    }
  }

  resolve(value: T): void {
    const { type } = this.state;
    if (type !== "pending") {
      return;
    }

    const { resolvers } = this.state;
    for (const resolve of resolvers) {
      resolve(value);
    }

    this.state = {
      type: "fulfilled",
      value,
    };
  }

  reject(reason?: any): void {
    const { type } = this.state;
    if (type !== "pending") {
      return;
    }

    const { rejecters } = this.state;
    for (const reject of rejecters) {
      reject(reason);
    }

    this.state = {
      type: "rejected",
      reason,
    };
  }
}
