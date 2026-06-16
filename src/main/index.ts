import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import type { RefreshResult } from '@shared/types';
import { openDatabase, getAllEvents, replaceEvents, setMeta, getMeta } from './db/database.js';
import { runAllScrapers } from './scrapers/index.js';
import { getRecentLogs, makeLogger } from './lib/logger.js';

const log = makeLogger('main');
let mainWindow: BrowserWindow | null = null;

const dbPath = join(app.getPath('userData'), 'events.sqlite');
const db = openDatabase(dbPath);
log.info(`database opened at ${dbPath}`);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 720,
    minHeight: 560,
    title: 'Tiny Helsinki Events',
    backgroundColor: '#fff7fb',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      sandbox: false,
      contextIsolation: true,
    },
  });

  // Open external links in the user's browser, not inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

async function doRefresh(): Promise<RefreshResult> {
  const { events, logs } = await runAllScrapers();
  replaceEvents(db, events);
  const lastUpdated = new Date().toISOString();
  setMeta(db, 'lastUpdated', lastUpdated);
  setMeta(db, 'lastLogs', JSON.stringify(logs));
  return { events, logs, lastUpdated };
}

function loadCached(): RefreshResult {
  const events = getAllEvents(db);
  const lastUpdated = getMeta(db, 'lastUpdated') ?? '';
  const logsRaw = getMeta(db, 'lastLogs');
  const logs = logsRaw ? JSON.parse(logsRaw) : [];
  return { events, logs, lastUpdated };
}

function registerIpc(): void {
  ipcMain.handle('events:get', () => loadCached());

  ipcMain.handle('events:refresh', async () => {
    log.info('refresh requested from renderer');
    try {
      return await doRefresh();
    } catch (err) {
      log.error(`refresh failed: ${err instanceof Error ? err.message : String(err)}`);
      // Return cached data so the UI degrades gracefully instead of crashing.
      return loadCached();
    }
  });

  ipcMain.handle('logs:get', () => getRecentLogs());
}

app.whenReady().then(async () => {
  registerIpc();
  createWindow();

  // If the cache is empty (first launch), kick off a refresh in the background.
  if (getAllEvents(db).length === 0) {
    log.info('cache empty on startup — running initial scrape');
    doRefresh()
      .then((result) => {
        mainWindow?.webContents.send('events:updated', result);
      })
      .catch((err) => log.error(`initial scrape failed: ${err}`));
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
