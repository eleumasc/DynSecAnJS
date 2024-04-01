export interface Agent {
  usePage<T>(
    options: UsePageOptions,
    cb: (page: PageController) => Promise<T>
  ): Promise<T>;
  terminate(): Promise<void>;
}

export interface UsePageOptions {
  proxyPort: number;
}

export type AgentFactory = () => Promise<Agent>;

export interface PageController {
  navigate(url: string, options: NavigateOptions): Promise<void>;
  screenshot(): Promise<Buffer>;
  setViewport(viewport: Viewport): Promise<void>;
}

export interface NavigateOptions {
  timeoutMs: number;
}

export interface Viewport {
  width: number;
  height: number;
}
