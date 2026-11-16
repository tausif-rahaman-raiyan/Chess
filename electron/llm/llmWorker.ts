import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ExplainRequest,
  ExplanationResult,
  IdeaCandidate,
} from '../../src/shared/types';
import { AnalysisCacheRepository } from '../db/repositories/analysisCacheRepo';
import { SettingsRepository } from '../db/repositories/settingsRepo';
import { buildGroundedChessPrompt } from './promptBuilder';
import { buildTemplateExplanation } from './templates';
import { validateLlmExplanation } from './validator';

export class OfflineLlmCoach {
  private loadedModelPath: string | null = null;
  private llamaInstance: unknown = null;
  private modelInstance: unknown = null;
  private streamListeners = new Set<(chunk: string) => void>();

  constructor(
    private readonly modelsDir: string,
    private readonly settingsRepo: SettingsRepository,
    private readonly cacheRepo: AnalysisCacheRepository,
  ) {}

  public onStreamChunk(listener: (chunk: string) => void): () => void {
    this.streamListeners.add(listener);
    return () => {
      this.streamListeners.delete(listener);
    };
  }

  public getSystemRamGb(): number {
    return Number((os.totalmem() / (1024 ** 3)).toFixed(1));
  }

  public resolveActiveModelPath(): { path: string | null; label: string; ramRestricted: boolean } {
    const settings = this.settingsRepo.getSettings();
    const ramGb = this.getSystemRamGb();
    const ramRestricted = ramGb < 6;

    if (
      !ramRestricted &&
      settings.llmModelTier === 'custom' &&
      settings.customModelPath &&
      fs.existsSync(settings.customModelPath)
    ) {
      return {
        path: settings.customModelPath,
        label: path.basename(settings.customModelPath),
        ramRestricted,
      };
    }

    if (!ramRestricted && settings.llmModelTier === 'standard' && fs.existsSync(this.modelsDir)) {
      const files = fs.readdirSync(this.modelsDir).filter((f) => f.endsWith('.gguf'));
      const std = files.find((f) => /3b/i.test(f));
      if (std) {
        return {
          path: path.join(this.modelsDir, std),
          label: std,
          ramRestricted,
        };
      }
    }

    const litePath = path.join(this.modelsDir, 'qwen2.5-1.5b-instruct-q4_k_m.gguf');
    if (fs.existsSync(litePath)) {
      return {
        path: litePath,
        label: 'Qwen2.5-1.5B-Instruct (Lite Q4_K_M)',
        ramRestricted,
      };
    }

    if (fs.existsSync(this.modelsDir)) {
      const anyGguf = fs.readdirSync(this.modelsDir).find((f) => f.endsWith('.gguf'));
      if (anyGguf) {
        return {
          path: path.join(this.modelsDir, anyGguf),
          label: anyGguf,
          ramRestricted,
        };
      }
    }

    return { path: null, label: 'None (Template Fallback Active)', ramRestricted };
  }

  public getStatus(): {
    status: 'ready' | 'missing-model' | 'template-only' | 'error';
    modelName: string;
    systemRamGb: number;
  } {
    const settings = this.settingsRepo.getSettings();
    const resolved = this.resolveActiveModelPath();
    if (settings.explanationMode !== 'ai') {
      return {
        status: 'template-only',
        modelName: 'Deterministic Engine Narrator',
        systemRamGb: this.getSystemRamGb(),
      };
    }
    if (!resolved.path) {
      return {
        status: 'missing-model',
        modelName: resolved.label,
        systemRamGb: this.getSystemRamGb(),
      };
    }
    return {
      status: 'ready',
      modelName: resolved.label,
      systemRamGb: this.getSystemRamGb(),
    };
  }

  public importGgufModel(sourcePath: string): { importedPath: string; fileName: string } {
    if (!fs.existsSync(sourcePath) || !sourcePath.toLowerCase().endsWith('.gguf')) {
      throw new Error('Please select a valid .gguf model file.');
    }
    fs.mkdirSync(this.modelsDir, { recursive: true });
    const fileName = path.basename(sourcePath);
    const dest = path.join(this.modelsDir, fileName);
    fs.copyFileSync(sourcePath, dest);
    this.settingsRepo.updateSettings({
      llmModelTier: 'custom',
      customModelPath: dest,
    });
    return { importedPath: dest, fileName };
  }

  private async runLlamaInference(
    modelPath: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    // Dynamic runtime require so unit tests or hosts without native llama binaries fall back cleanly
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeLlama = require('node-llama-cpp') as {
      getLlama: () => Promise<{
        loadModel: (opts: { modelPath: string }) => Promise<{
          createContext: (opts: { contextSize: number; threads: number }) => Promise<{
            getSequence: () => unknown;
            dispose: () => Promise<void>;
          }>;
        }>;
        createGrammarForJsonSchema: (schema: Record<string, unknown>) => Promise<unknown>;
      }>;
      LlamaChatSession: new (opts: {
        contextSequence: unknown;
        systemPrompt: string;
      }) => {
        prompt: (
          text: string,
          opts: {
            temperature: number;
            maxTokens: number;
            grammar?: unknown;
            onTextChunk?: (chunk: string) => void;
          },
        ) => Promise<string>;
      };
    };

    const settings = this.settingsRepo.getSettings();
    const llama =
      (this.llamaInstance as Awaited<ReturnType<typeof nodeLlama.getLlama>>) ??
      (await nodeLlama.getLlama());
    this.llamaInstance = llama;

    if (!this.modelInstance || this.loadedModelPath !== modelPath) {
      this.modelInstance = await llama.loadModel({ modelPath });
      this.loadedModelPath = modelPath;
    }

    const model = this.modelInstance as Awaited<ReturnType<typeof llama.loadModel>>;
    const context = await model.createContext({
      contextSize: settings.llmContextSize,
      threads: settings.llmThreads,
    });

    try {
      const grammar = await llama.createGrammarForJsonSchema({
        type: 'object',
        properties: {
          summary: { type: 'string' },
          whyBest: { type: 'string' },
          pieceOrMoveDetail: { type: 'string' },
          ideas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                san: { type: 'string' },
                reason: { type: 'string' },
              },
              required: ['san', 'reason'],
            },
          },
        },
        required: ['summary', 'whyBest', 'pieceOrMoveDetail', 'ideas'],
      });

      const session = new nodeLlama.LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt,
      });

      return await session.prompt(userPrompt, {
        temperature,
        maxTokens,
        grammar,
        onTextChunk: (chunk) => {
          for (const listener of this.streamListeners) {
            listener(chunk);
          }
        },
      });
    } finally {
      await context.dispose();
    }
  }

  public async explain(req: ExplainRequest): Promise<ExplanationResult> {
    const resolved = this.resolveActiveModelPath();
    const cacheKey = `${req.fen}|${req.playedMoveSan ?? ''}|${req.selectedSquare ?? ''}|${req.level}|${req.mode}|${resolved.label}`;

    const cached = this.cacheRepo.getCachedExplanation(cacheKey);
    if (cached) {
      return cached;
    }

    const templateResult = buildTemplateExplanation(req.facts, req.level);

    if (req.mode !== 'ai' || !resolved.path) {
      this.cacheRepo.putCachedExplanation(cacheKey, templateResult);
      return templateResult;
    }

    const settings = this.settingsRepo.getSettings();
    const prompt = buildGroundedChessPrompt(req.facts, req.level);

    for (const attemptTemp of [settings.llmTemperature, 0]) {
      try {
        const rawText = await this.runLlamaInference(
          resolved.path,
          prompt.systemPrompt,
          prompt.userPrompt,
          attemptTemp,
          settings.llmMaxTokens,
        );

        const validation = validateLlmExplanation(rawText, req.facts);
        if (validation.valid && validation.parsed) {
          const enrichedIdeas: IdeaCandidate[] =
            validation.parsed.ideas.length >= 2
              ? validation.parsed.ideas.slice(0, 4).map((idea) => {
                  const templateMatch = templateResult.ideas.find((t) => t.san === idea.san);
                  return {
                    san: idea.san,
                    uci: templateMatch?.uci ?? '',
                    evalText: templateMatch?.evalText ?? 'Line',
                    reason: idea.reason,
                  };
                })
              : templateResult.ideas;

          const aiResult: ExplanationResult = {
            summary: validation.parsed.summary,
            whyBest: validation.parsed.whyBest,
            pieceOrMoveDetail:
              validation.parsed.pieceOrMoveDetail || templateResult.pieceOrMoveDetail,
            ideas: enrichedIdeas,
            source: 'ai-worded',
            modelName: resolved.label,
            validationPassed: true,
            cached: false,
          };

          this.cacheRepo.putCachedExplanation(cacheKey, aiResult);
          return aiResult;
        }
      } catch {
        // Retry once at temperature 0, then fall back to deterministic template
      }
    }

    this.cacheRepo.putCachedExplanation(cacheKey, templateResult);
    return templateResult;
  }
}
