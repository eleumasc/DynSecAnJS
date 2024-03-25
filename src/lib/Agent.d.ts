export interface PageController {
  navigate: (url: string) => Promise<void>;
  screenshot: () => Promise<Buffer>;
}

export interface UsePageOptions {
  proxyPort: number;
}

export interface Agent {
  usePage<T>(
    options: UsePageOptions,
    cb: (page: PageController) => Promise<T>
  ): Promise<T>;
  terminate(): Promise<void>;
}

export type AgentFactory = () => Promise<Agent>;
