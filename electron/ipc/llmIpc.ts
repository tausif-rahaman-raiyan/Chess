import { BrowserWindow, dialog, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/shared/ipcChannels';
import { ExplainRequestSchema } from '../../src/shared/types';
import { buildPositionFacts } from '../../src/core/tactics';
import { OfflineLlmCoach } from '../llm/llmWorker';

export function registerLlmIpc(llmCoach: OfflineLlmCoach, getWindow: () => BrowserWindow | null): void {
  llmCoach.onStreamChunk((chunk) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.LLM_STREAM_EVENT, chunk);
    }
  });

  ipcMain.handle(IPC_CHANNELS.LLM_EXPLAIN, async (_event, rawPayload: unknown) => {
    const parsed = ExplainRequestSchema.parse(rawPayload);
    return llmCoach.explain(parsed);
  });

  ipcMain.handle(IPC_CHANNELS.LLM_TEST_PROMPT, async () => {
    const sampleFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const facts = buildPositionFacts({
      fen: sampleFen,
      openingEco: 'C44',
      openingName: "King's Knight Opening",
    });
    return llmCoach.explain({
      fen: sampleFen,
      facts,
      level: 'intermediate',
      mode: 'ai',
    });
  });

  ipcMain.handle(IPC_CHANNELS.LLM_IMPORT_MODEL, async () => {
    const win = getWindow();
    const res = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Import Offline GGUF Chess Coach Model',
      filters: [{ name: 'GGUF Model Files', extensions: ['gguf'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) {
      return { canceled: true };
    }
    const imported = llmCoach.importGgufModel(res.filePaths[0]!);
    return { canceled: false, ...imported };
  });
}
