import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/shared/ipcChannels';
import { AnalyzeRequestSchema, BotMoveRequestSchema } from '../../src/shared/types';
import { EngineManager } from '../engine/engineManager';

export function registerEngineIpc(engineManager: EngineManager, getWindow: () => BrowserWindow | null): void {
  engineManager.onProgress((snapshot) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.ENGINE_INFO_EVENT, snapshot);
    }
  });

  ipcMain.handle(IPC_CHANNELS.ENGINE_ANALYZE, async (_event, rawPayload: unknown) => {
    const parsed = AnalyzeRequestSchema.parse(rawPayload);
    return engineManager.analyze(parsed);
  });

  ipcMain.handle(IPC_CHANNELS.ENGINE_STOP, () => {
    engineManager.stopSearch();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.ENGINE_BOT_MOVE, async (_event, rawPayload: unknown) => {
    const parsed = BotMoveRequestSchema.parse(rawPayload);
    return engineManager.selectBotMove(parsed);
  });

  ipcMain.handle(IPC_CHANNELS.ENGINE_TEST, async () => {
    return engineManager.testEngine();
  });
}
