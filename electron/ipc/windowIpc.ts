import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/shared/ipcChannels';
import { OfflineStatusReport } from '../../src/shared/types';
import { EngineManager } from '../engine/engineManager';
import { OfflineLlmCoach } from '../llm/llmWorker';
import { WindowManager } from '../windowManager';

export function registerWindowIpc(
  windowManager: WindowManager,
  getOfflineReport: () => Omit<
    OfflineStatusReport,
    'activeEngineBinary' | 'cpuFeatures' | 'systemRamGb' | 'llmStatus' | 'llmModelName'
  >,
  engineManager: EngineManager,
  llmCoach: OfflineLlmCoach,
): void {
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    windowManager.getWindow()?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE_TOGGLE, () => {
    const win = windowManager.getWindow();
    if (!win) return { isMaximized: false, isFullScreen: false };
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    } else if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return windowManager.getWindowState();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    windowManager.getWindow()?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_FULLSCREEN_TOGGLE, () => {
    const win = windowManager.getWindow();
    if (!win) return { isMaximized: false, isFullScreen: false };
    win.setFullScreen(!win.isFullScreen());
    return windowManager.getWindowState();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_EXIT_FULLSCREEN, () => {
    const win = windowManager.getWindow();
    if (win && win.isFullScreen()) {
      win.setFullScreen(false);
    }
    return windowManager.getWindowState();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_STATE, () => {
    return windowManager.getWindowState();
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_OFFLINE_STATUS, (): OfflineStatusReport => {
    const base = getOfflineReport();
    const eng = engineManager.getDiagnostics();
    const llm = llmCoach.getStatus();
    return {
      ...base,
      activeEngineBinary: eng.activeBinary,
      cpuFeatures: eng.cpuFeatures,
      systemRamGb: llm.systemRamGb,
      llmStatus: llm.status,
      llmModelName: llm.modelName,
    };
  });
}
