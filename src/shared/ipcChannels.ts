export const IPC_CHANNELS = {
  // Engine
  ENGINE_ANALYZE: 'engine:analyze',
  ENGINE_STOP: 'engine:stop',
  ENGINE_BOT_MOVE: 'engine:botMove',
  ENGINE_TEST: 'engine:test',
  ENGINE_INFO_EVENT: 'engine:infoEvent',

  // LLM Explanation
  LLM_EXPLAIN: 'llm:explain',
  LLM_TEST_PROMPT: 'llm:testPrompt',
  LLM_IMPORT_MODEL: 'llm:importModel',
  LLM_STREAM_EVENT: 'llm:streamEvent',

  // Storage & Games
  STORAGE_GET_SETTINGS: 'storage:getSettings',
  STORAGE_UPDATE_SETTINGS: 'storage:updateSettings',
  STORAGE_RESET_SETTINGS: 'storage:resetSettings',
  STORAGE_SAVE_GAME: 'storage:saveGame',
  STORAGE_LIST_GAMES: 'storage:listGames',
  STORAGE_GET_GAME: 'storage:getGame',
  STORAGE_DELETE_GAMES: 'storage:deleteGames',
  STORAGE_TOGGLE_FAVORITE: 'storage:toggleFavorite',
  STORAGE_UPDATE_NOTES: 'storage:updateNotes',
  STORAGE_GET_AUTOSAVE: 'storage:getAutosave',
  STORAGE_EXPORT_ZIP: 'storage:exportZip',
  STORAGE_IMPORT_ZIP: 'storage:importZip',
  STORAGE_CLEAR_CACHE: 'storage:clearCache',
  STORAGE_DELETE_ALL: 'storage:deleteAll',
  STORAGE_EXPORT_PGN_FILE: 'storage:exportPgnFile',
  STORAGE_IMPORT_PGN_FILE: 'storage:importPgnFile',

  // Window & Security Verification
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE_TOGGLE: 'window:maximizeToggle',
  WINDOW_CLOSE: 'window:close',
  WINDOW_FULLSCREEN_TOGGLE: 'window:fullscreenToggle',
  WINDOW_EXIT_FULLSCREEN: 'window:exitFullscreen',
  WINDOW_GET_STATE: 'window:getState',
  WINDOW_STATE_EVENT: 'window:stateEvent',
  APP_GET_OFFLINE_STATUS: 'app:getOfflineStatus',
} as const;
