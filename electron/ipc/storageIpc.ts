import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import { z } from 'zod';
import { IPC_CHANNELS } from '../../src/shared/ipcChannels';
import { AppSettingsPatchSchema, SaveGamePayloadSchema } from '../../src/shared/types';
import { OfflineDatabase } from '../db/database';
import { AnalysisCacheRepository } from '../db/repositories/analysisCacheRepo';
import { GamesRepository } from '../db/repositories/gamesRepo';
import { SettingsRepository } from '../db/repositories/settingsRepo';

export function registerStorageIpc(
  database: OfflineDatabase,
  gamesRepo: GamesRepository,
  cacheRepo: AnalysisCacheRepository,
  settingsRepo: SettingsRepository,
  getWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_SETTINGS, () => settingsRepo.getSettings());

  ipcMain.handle(IPC_CHANNELS.STORAGE_UPDATE_SETTINGS, (_event, rawPatch: unknown) => {
    const patch = AppSettingsPatchSchema.parse(rawPatch);
    return settingsRepo.updateSettings(patch);
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_RESET_SETTINGS, () => settingsRepo.resetToDefaults());

  ipcMain.handle(IPC_CHANNELS.STORAGE_SAVE_GAME, (_event, rawPayload: unknown) => {
    const payload = SaveGamePayloadSchema.parse(rawPayload);
    return gamesRepo.saveGame(payload);
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_LIST_GAMES, (_event, rawIncludeAutosave: unknown) => {
    const includeAutosave = z.boolean().optional().parse(rawIncludeAutosave) ?? false;
    return gamesRepo.listGames(includeAutosave);
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_GAME, (_event, rawId: unknown) => {
    const id = z.number().int().positive().parse(rawId);
    return gamesRepo.getGameById(id);
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_DELETE_GAMES, (_event, rawIds: unknown) => {
    const ids = z.array(z.number().int().positive()).parse(rawIds);
    return { deleted: gamesRepo.deleteGames(ids) };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_TOGGLE_FAVORITE, (_event, rawId: unknown) => {
    const id = z.number().int().positive().parse(rawId);
    return { favorite: gamesRepo.toggleFavorite(id) };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_UPDATE_NOTES, (_event, rawPayload: unknown) => {
    const { id, notes } = z
      .object({ id: z.number().int().positive(), notes: z.string().max(4000) })
      .parse(rawPayload);
    gamesRepo.updateNotes(id, notes);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_AUTOSAVE, () => gamesRepo.getAutosaveGame());

  ipcMain.handle(IPC_CHANNELS.STORAGE_CLEAR_CACHE, () => {
    cacheRepo.clearCaches();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_DELETE_ALL, () => {
    database.clearAllData();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_EXPORT_ZIP, async () => {
    const win = getWindow();
    const res = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Export OfflineChess Pro Backup Archive',
      defaultPath: `OfflineChessPro-Backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    database.exportBackupZip(res.filePath);
    return { canceled: false, path: res.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_IMPORT_ZIP, async () => {
    const win = getWindow();
    const res = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Restore OfflineChess Pro Backup Archive',
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    database.importBackupZip(res.filePaths[0]!);
    return { canceled: false };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_EXPORT_PGN_FILE, async (_event, rawPayload: unknown) => {
    const { content, defaultFileName } = z
      .object({ content: z.string().min(1), defaultFileName: z.string().min(1) })
      .parse(rawPayload);
    const win = getWindow();
    const res = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Export PGN File',
      defaultPath: defaultFileName,
      filters: [{ name: 'PGN Chess Games', extensions: ['pgn'] }],
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    fs.writeFileSync(res.filePath, content, 'utf8');
    return { canceled: false, path: res.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_IMPORT_PGN_FILE, async () => {
    const win = getWindow();
    const res = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Import PGN File',
      filters: [{ name: 'PGN Chess Games', extensions: ['pgn', 'txt'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const content = fs.readFileSync(res.filePaths[0]!, 'utf8');
    return { canceled: false, content };
  });
}
