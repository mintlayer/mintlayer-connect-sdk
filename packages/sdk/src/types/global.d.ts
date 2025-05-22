export {};

declare global {
  interface Window {
    mojito?: {
      request?: (method: string, params: any) => Promise<any>;
      connect?: () => Promise<any>;
      disconnect?: () => Promise<void>;
      restore?: () => Promise<any>;
    };
  }
}
