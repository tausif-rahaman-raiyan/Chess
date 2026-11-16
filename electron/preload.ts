import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../src/shared/ipcChannels';
import type {
  AnalyzeRequest,
  AppSettings,
  BotMoveRequest,
  BotMoveResponse,
  EngineEvaluation,
  ExplainRequest,
  ExplanationResult,
  OfflineStatusReport,
  SavedGameRecord,
  SaveGamePayload,
} from '../src/shared/types';

export interface OfflineChessApi {
  analyzePosition: (req: AnalyzeRequest) => Promise<EngineEvaluation>;
  stopEngine: () => Promise<{ ok: boolean }>;
  getBotMove: (req: BotMoveRequest) => Promise<BotMoveResponse>;
  testEngine: () => Promise<{ ok: boolean; binary: string; depthReached: number }>;
  onEngineInfo: (cb: (snapshot: EngineEvaluation) => void) => () => void;

  explainPosition: (req: ExplainRequest) => Promise<ExplanationResult>;
  testLlmPrompt: () => Promise<ExplanationResult>;
  importGgufModel: () => Promise<{ canceled: boolean; importedPath?: string; fileName?: string }>;
  onLlmStream: (cb: (chunk: string) => void) => () => void;

  getSettings: () => Promise<AppSettings>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  resetSettings: () => Promise<AppSettings>;

  saveGame: (payload: SaveGamePayload) => Promise<SavedGameRecord>;
  listGames: (includeAutosave?: boolean) => Promise<SavedGameRecord[]>;
  getGame: (id: number) => Promise<SavedGameRecord | null>;
  deleteGames: (ids: number[]) => Promise<{ deleted: number }>;
  toggleFavorite: (id: number) => Promise<{ favorite: boolean }>;
  updateNotes: (id: number, notes: string) => Promise<{ ok: boolean }>;
  getAutosave: () => Promise<SavedGameRecord | null>;

  exportBackupZip: () => Promise<{ canceled: boolean; path?: string }>;
  importBackupZip: () => Promise<{ canceled: boolean }>;
  clearCaches: () => Promise<{ ok: boolean }>;
  deleteAllData: () => Promise<{ ok: boolean }>;
  exportPgnFile: (content: string, defaultFileName: string) => Promise<{ canceled: boolean; path?: string }>;
  importPgnFile: () => Promise<{ canceled: boolean; content?: string }>;

  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<{ isMaximized: boolean; isFullScreen: boolean }>;
  closeWindow: () => Promise<void>;
  toggleFullscreen: () => Promise<{ isMaximized: boolean; isFullScreen: boolean }>;
  exitFullscreen: () => Promise<{ isMaximized: boolean; isFullScreen: boolean }>;
  getWindowState: () => Promise<{ isMaximized: boolean; isFullScreen: boolean }>;
  onWindowStateChange: (cb: (state: { isMaximized: boolean; isFullScreen: boolean }) => void) => () => void;

  getOfflineStatus: () => Promise<OfflineStatusReport>;
}

const api: OfflineChessApi = {
  analyzePosition: (req) => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_ANALYZE, req),
  stopEngine: () => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_STOP),
  getBotMove: (req) => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_BOT_MOVE, req),
  testEngine: () => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_TEST),
  onEngineInfo: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, data: EngineEvaluation) => cb(data);
    ipcRenderer.on(IPC_CHANNELS.ENGINE_INFO_EVENT, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ENGINE_INFO_EVENT, listener);
  },

  explainPosition: (req) => ipcRenderer.invoke(IPC_CHANNELS.LLM_EXPLAIN, req),
  testLlmPrompt: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_TEST_PROMPT),
  importGgufModel: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_IMPORT_MODEL),
  onLlmStream: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: string) => cb(chunk);
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_EVENT, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_STREAM_EVENT, listener);
  },

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_SETTINGS),
  updateSettings: (patch) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_UPDATE_SETTINGS, patch),
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_RESET_SETTINGS),

  saveGame: (payload) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SAVE_GAME, payload),
  listGames: (includeAutosave = false) =>
    ipcRenderer.invoke(IPC_CHANNELS.STORAGE_LIST_GAMES, includeAutosave),
  getGame: (id) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_GAME, id),
  deleteGames: (ids) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_DELETE_GAMES, ids),
  toggleFavorite: (id) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_TOGGLE_FAVORITE, id),
  updateNotes: (id, notes) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_UPDATE_NOTES, { id, notes }),
  getAutosave: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_AUTOSAVE),

  exportBackupZip: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_EXPORT_ZIP),
  importBackupZip: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_IMPORT_ZIP),
  clearCaches: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_CLEAR_CACHE),
  deleteAllData: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_DELETE_ALL),
  exportPgnFile: (content, defaultFileName) =>
    ipcRenderer.invoke(IPC_CHANNELS.STORAGE_EXPORT_PGN_FILE, { content, defaultFileName }),
  importPgnFile: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_IMPORT_PGN_FILE),

  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  toggleMaximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE_TOGGLE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  toggleFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_FULLSCREEN_TOGGLE),
  exitFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_EXIT_FULLSCREEN),
  getWindowState: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_STATE),
  onWindowStateChange: (cb) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: { isMaximized: boolean; isFullScreen: boolean },
    ) => cb(state);
    ipcRenderer.on(IPC_CHANNELS.WINDOW_STATE_EVENT, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_STATE_EVENT, listener);
  },

  getOfflineStatus: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_OFFLINE_STATUS),
};

contextBridge.exposeInMainWorld('offlineChess', api);
