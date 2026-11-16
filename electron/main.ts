import { app, session } from 'electron';
import path from 'node:path';
import { OfflineDatabase } from './db/database';
import { AnalysisCacheRepository } from './db/repositories/analysisCacheRepo';
import { GamesRepository } from './db/repositories/gamesRepo';
import { SettingsRepository } from './db/repositories/settingsRepo';
import { EngineManager } from './engine/engineManager';
import { registerEngineIpc } from './ipc/engineIpc';
import { registerLlmIpc } from './ipc/llmIpc';
import { registerStorageIpc } from './ipc/storageIpc';
import { registerWindowIpc } from './ipc/windowIpc';
import { OfflineLlmCoach } from './llm/llmWorker';
import { WindowManager } from './windowManager';

const isDev = !app.isPackaged;
const storageDir = path.join(app.getPath('appData'), 'OfflineChessPro');

let blockedRequestsCount = 0;
const blockedUrlsSample: string[] = [];

function resolveResourcesBase(): string {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.resolve(__dirname, '..', '..', 'resources');
}

function setupOfflineNetworkFirewall(): void {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:')) {
      callback({ cancel: false });
      return;
    }
    if (isDev && (url.startsWith('http://localhost:5173') || url.startsWith('ws://localhost:5173') || url.startsWith('devtools://'))) {
      callback({ cancel: false });
      return;
    }
    blockedRequestsCount++;
    if (blockedUrlsSample.length < 10) {
      blockedUrlsSample.push(url);
    }
    callback({ cancel: true });
  });

  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'none';",
          ],
        },
      });
    });
  }
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  setupOfflineNetworkFirewall();

  const resourcesBase = resolveResourcesBase();
  const enginesDir = path.join(resourcesBase, 'engines');
  const modelsDir = path.join(resourcesBase, 'models');

  const database = new OfflineDatabase(storageDir);
  const settingsRepo = new SettingsRepository(storageDir);
  const gamesRepo = new GamesRepository(database);
  const cacheRepo = new AnalysisCacheRepository(database);

  const engineManager = new EngineManager(enginesDir, settingsRepo, cacheRepo);
  const llmCoach = new OfflineLlmCoach(modelsDir, settingsRepo, cacheRepo);
  const windowManager = new WindowManager(storageDir);

  registerEngineIpc(engineManager, () => windowManager.getWindow());
  registerLlmIpc(llmCoach, () => windowManager.getWindow());
  registerStorageIpc(database, gamesRepo, cacheRepo, settingsRepo, () => windowManager.getWindow());
  registerWindowIpc(
    windowManager,
    () => ({
      blockedRequestsCount,
      blockedUrlsSample,
      cspActive: true,
      storageDirectory: storageDir,
    }),
    engineManager,
    llmCoach,
  );

  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, '..', 'build', 'icon.ico')
    : path.resolve(__dirname, '..', '..', 'build', 'icon.ico');

  const mainWin = windowManager.createMainWindow(preloadPath, iconPath);

  if (isDev) {
    await mainWin.loadURL('http://localhost:5173');
  } else {
    const indexHtml = path.resolve(__dirname, '..', '..', 'dist', 'index.html');
    await mainWin.loadFile(indexHtml);
  }

  app.on('before-quit', () => {
    void engineManager.shutdown();
    database.close();
  });
}

void bootstrap();
