export interface Agent {
  use<T>(
    useOptions: UseOptions,
    cb: (controller: AgentController) => Promise<T>
  ): Promise<T>;
}

export interface UseOptions {
  proxyPort: number;
}

export interface AgentController {
  navigate(url: string, timeoutMs: number): Promise<void>;
  screenshot(): Promise<Buffer>;
  setViewport(viewport: Viewport): Promise<void>;
}

export interface Viewport {
  width: number;
  height: number;
}
