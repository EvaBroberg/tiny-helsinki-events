/// <reference types="vite/client" />
import type { TinyEventsApi } from '../main/preload';

declare global {
  interface Window {
    api: TinyEventsApi;
  }
}

export {};
