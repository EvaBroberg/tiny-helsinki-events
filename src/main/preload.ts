import { contextBridge, ipcRenderer } from 'electron';
import type { RefreshResult } from '@shared/types';
import type { LogLine } from './lib/logger.js';

const api = {
  getEvents: (): Promise<RefreshResult> => ipcRenderer.invoke('events:get'),
  refresh: (): Promise<RefreshResult> => ipcRenderer.invoke('events:refresh'),
  getLogs: (): Promise<LogLine[]> => ipcRenderer.invoke('logs:get'),
  onEventsUpdated: (cb: (result: RefreshResult) => void) => {
    const handler = (_e: unknown, result: RefreshResult) => cb(result);
    ipcRenderer.on('events:updated', handler);
    return () => ipcRenderer.removeListener('events:updated', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type TinyEventsApi = typeof api;
