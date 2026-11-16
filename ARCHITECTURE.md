# OfflineChess Pro Architecture

## Process Separation
1. **Electron Main Process (`electron/main.ts`):**
   - Enforces air-gapped offline operation by blocking all external `http/https/ws` requests via `session.defaultSession.webRequest.onBeforeRequest`.
   - Manages frameless window state (`electron/windowManager.ts`), SQLite WAL database (`electron/db/database.ts`), Stockfish UCI child process (`electron/engine/engineManager.ts`), and local GGUF inference (`electron/llm/llmWorker.ts`).
2. **Preload Bridge (`electron/preload.ts`):**
   - Runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
   - Exposes a strictly typed `window.offlineChess` API validated by Zod schemas (`src/shared/types.ts`).
3. **React Renderer (`src/`):**
   - Pure UI & state management (`zustand`), deterministic tactics analyzer (`src/core/tactics.ts`), win-probability & accuracy math (`src/core/winProbability.ts`, `src/core/accuracy.ts`), and Web Audio procedural sound synthesizer (`src/core/soundEngine.ts`).
