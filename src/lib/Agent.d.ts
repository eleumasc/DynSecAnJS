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
  navigate(url: string): Promise<void>;
  screenshot(): Promise<Buffer>;
  setViewport(viewport: Viewport): Promise<void>;
}

export interface Viewport {
  width: number;
  height: number;
}
