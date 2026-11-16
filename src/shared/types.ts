import { z } from 'zod';

export type PieceColor = 'w' | 'b';
export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Square = string;

export type MoveClassification =
  | 'book'
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'miss';

export type ExplanationLevel = 'beginner' | 'intermediate' | 'advanced';
export type ExplanationMode = 'off' | 'template' | 'ai';
export type ThinkingDelayMode = 'instant' | 'human' | 'slow';
export type AppThemeMode = 'dark' | 'light' | 'system';
export type CoordinatePosition = 'inside' | 'outside' | 'none';
export type SoundPackId = 'soft' | 'wood' | 'classic';

export interface ClassificationThresholds {
  bestMaxEpl: number;
  excellentMaxEpl: number;
  goodMaxEpl: number;
  inaccuracyMaxEpl: number;
  mistakeMaxEpl: number;
}

export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
  bestMaxEpl: 0.0,
  excellentMaxEpl: 0.02,
  goodMaxEpl: 0.05,
  inaccuracyMaxEpl: 0.1,
  mistakeMaxEpl: 0.2,
};

export interface AppSettings {
  schemaVersion: number;
  language: 'en';
  theme: AppThemeMode;
  accentColor: string;
  boardTheme: string;
  pieceSet: string;
  boardSizePx: number;
  boardAutoFit: boolean;
  coordinates: CoordinatePosition;
  showLegalDots: boolean;
  showLastMove: boolean;
  showPremoveArrows: boolean;
  dragAndClick: 'both' | 'drag' | 'click';
  snapAnimation: boolean;
  soundEnabled: boolean;
  soundPack: SoundPackId;
  soundVolume: number;
  badgeSoundEnabled: boolean;
  animationDurationMs: number;
  animateCaptures: boolean;
  animateCheckPulse: boolean;
  animateCheckmate: boolean;
  animatePanelSlide: boolean;
  animateBadgePop: boolean;
  reduceMotion: boolean;
  engineThreads: number;
  engineHashMb: number;
  engineDefaultDepth: number;
  engineMultiPv: number;
  customEnginePath: string;
  explanationMode: ExplanationMode;
  explanationLevel: ExplanationLevel;
  llmModelTier: 'lite' | 'standard' | 'custom';
  customModelPath: string;
  llmContextSize: number;
  llmMaxTokens: number;
  llmTemperature: number;
  llmThreads: number;
  moveQualityEnabled: boolean;
  enabledBadgeCategories: Record<MoveClassification, boolean>;
  classificationThresholds: ClassificationThresholds;
  moveQualityMinDepth: number;
  moveQualityMaxWaitMs: number;
  defaultRating: number;
  defaultTimeControl: string;
  autoQueen: boolean;
  takebackLimit: number;
  touchMoveRule: boolean;
  thinkingDelayMode: ThinkingDelayMode;
  allowPremoves: boolean;
  assistModeInPlay: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: 1,
  language: 'en',
  theme: 'dark',
  accentColor: '#38bdf8',
  boardTheme: 'classic-green',
  pieceSet: 'neo-classic',
  boardSizePx: 640,
  boardAutoFit: true,
  coordinates: 'inside',
  showLegalDots: true,
  showLastMove: true,
  showPremoveArrows: true,
  dragAndClick: 'both',
  snapAnimation: true,
  soundEnabled: true,
  soundPack: 'wood',
  soundVolume: 0.75,
  badgeSoundEnabled: true,
  animationDurationMs: 350,
  animateCaptures: true,
  animateCheckPulse: true,
  animateCheckmate: true,
  animatePanelSlide: true,
  animateBadgePop: true,
  reduceMotion: false,
  engineThreads: 2,
  engineHashMb: 128,
  engineDefaultDepth: 18,
  engineMultiPv: 3,
  customEnginePath: '',
  explanationMode: 'ai',
  explanationLevel: 'intermediate',
  llmModelTier: 'lite',
  customModelPath: '',
  llmContextSize: 2048,
  llmMaxTokens: 360,
  llmTemperature: 0.3,
  llmThreads: 4,
  moveQualityEnabled: true,
  enabledBadgeCategories: {
    book: true,
    brilliant: true,
    great: true,
    best: true,
    excellent: true,
    good: true,
    inaccuracy: true,
    mistake: true,
    blunder: true,
    miss: true,
  },
  classificationThresholds: DEFAULT_CLASSIFICATION_THRESHOLDS,
  moveQualityMinDepth: 16,
  moveQualityMaxWaitMs: 600,
  defaultRating: 1200,
  defaultTimeControl: '10+0',
  autoQueen: false,
  takebackLimit: 3,
  touchMoveRule: false,
  thinkingDelayMode: 'human',
  allowPremoves: false,
  assistModeInPlay: false,
};

export const AppSettingsPatchSchema = z.record(z.unknown());

export interface EngineLine {
  multipv: number;
  depth: number;
  seldepth: number;
  scoreCp: number | null;
  mateIn: number | null;
  nodes: number;
  nps: number;
  pvUci: string[];
  pvSan: string[];
}

export interface EngineEvaluation {
  fen: string;
  depth: number;
  nodes: number;
  nps: number;
  bestMoveUci: string;
  bestMoveSan: string;
  ponderUci: string | null;
  lines: EngineLine[];
  engineName: string;
  engineVersion: string;
  fromCache?: boolean;
}

export const AnalyzeRequestSchema = z.object({
  fen: z.string().min(10).max(140),
  depth: z.number().int().min(1).max(40).default(18),
  movetimeMs: z.number().int().min(10).max(60000).optional(),
  multipv: z.number().int().min(1).max(5).default(3),
  infinite: z.boolean().optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const BotMoveRequestSchema = z.object({
  fen: z.string().min(10).max(140),
  rating: z.number().int().min(0).max(3500),
  thinkingDelayMode: z.enum(['instant', 'human', 'slow']).default('human'),
});
export type BotMoveRequest = z.infer<typeof BotMoveRequestSchema>;

export interface BotMoveResponse {
  moveUci: string;
  moveSan: string;
  delayMs: number;
  usedHumanizer: boolean;
  debugInfo: string;
}

export interface TacticalPieceRef {
  square: Square;
  piece: PieceSymbol;
  color: PieceColor;
  value: number;
}

export interface TacticalRelation {
  type: 'pin' | 'skewer' | 'fork' | 'discovered_attack' | 'hanging' | 'lower_value_attack';
  attackerSquare: Square;
  attackerPiece: PieceSymbol;
  targetSquares: Square[];
  description: string;
}

export interface PieceSquareInsight {
  square: Square;
  piece: PieceSymbol;
  color: PieceColor;
  legalDestinations: Square[];
  bestDestination: Square | null;
  worstDestination: Square | null;
  isAttacked: boolean;
  isDefended: boolean;
  summary: string;
}

export interface PositionFacts {
  fen: string;
  turn: PieceColor;
  fullMoveNumber: number;
  phase: 'opening' | 'middlegame' | 'endgame';
  evalCp: number | null;
  mateIn: number | null;
  winProbWhite: number;
  depth: number;
  bestMoveSan: string;
  bestMoveUci: string;
  topLines: Array<{
    san: string;
    evalText: string;
    pvSan: string[];
  }>;
  materialWhite: number;
  materialBlack: number;
  materialDiff: number;
  hangingPieces: TacticalPieceRef[];
  tactics: TacticalRelation[];
  backRankWeaknessWhite: boolean;
  backRankWeaknessBlack: boolean;
  mateThreatAgainstMover: boolean;
  availableChecksSan: string[];
  pawnStructure: {
    isolatedWhite: number;
    isolatedBlack: number;
    doubledWhite: number;
    doubledBlack: number;
    passedWhite: Square[];
    passedBlack: Square[];
    islandsWhite: number;
    islandsBlack: number;
  };
  openFiles: string[];
  halfOpenFilesWhite: string[];
  halfOpenFilesBlack: string[];
  kingSafety: {
    whiteScore: number;
    blackScore: number;
    whiteCastled: boolean;
    blackCastled: boolean;
  };
  developmentDiff: number;
  centerControlDiff: number;
  openingEco: string | null;
  openingName: string | null;
  legalMovesSan: string[];
  selectedPieceInsight?: PieceSquareInsight | null;
  selectedSquare?: Square | null;
  playedMoveContext?: {
    san: string;
    classification: MoveClassification;
    winProbLoss: number;
    bestMoveSan: string;
    opponentBestReplySan: string | null;
  } | null;
}

export interface IdeaCandidate {
  san: string;
  uci: string;
  evalText: string;
  reason: string;
}

export interface ExplanationResult {
  summary: string;
  whyBest: string;
  pieceOrMoveDetail: string;
  ideas: IdeaCandidate[];
  source: 'ai-worded' | 'engine-verified';
  modelName: string;
  validationPassed: boolean;
  cached: boolean;
}

export const ExplainRequestSchema = z.object({
  fen: z.string().min(10).max(140),
  facts: z.custom<PositionFacts>(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  mode: z.enum(['off', 'template', 'ai']),
  selectedSquare: z.string().nullable().optional(),
  playedMoveSan: z.string().nullable().optional(),
});
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

export interface RecordedMove {
  ply: number;
  san: string;
  uci: string;
  fenAfter: string;
  evalCp: number | null;
  mate: number | null;
  winProb: number;
  bestMove: string | null;
  classification: MoveClassification | null;
  timeMs: number;
}

export interface SavedGameRecord {
  id: number;
  pgn: string;
  white: string;
  black: string;
  result: string;
  date: string;
  timeControl: string;
  myColor: PieceColor;
  opponentRating: number;
  openingEco: string;
  openingName: string;
  accuracyMe: number | null;
  createdAt: string;
  notes: string;
  favorite: boolean;
  isAutosave: boolean;
  moves?: RecordedMove[];
}

export const SaveGamePayloadSchema = z.object({
  id: z.number().int().positive().optional(),
  pgn: z.string().min(1),
  white: z.string().min(1).max(80),
  black: z.string().min(1).max(80),
  result: z.string().min(1).max(20),
  date: z.string().min(4).max(32),
  timeControl: z.string().min(1).max(40),
  myColor: z.enum(['w', 'b']),
  opponentRating: z.number().int().min(0).max(3500),
  openingEco: z.string().max(16).default('A00'),
  openingName: z.string().max(160).default('Unclassified Position'),
  accuracyMe: z.number().min(0).max(100).nullable().default(null),
  notes: z.string().max(4000).default(''),
  favorite: z.boolean().default(false),
  isAutosave: z.boolean().default(false),
  moves: z
    .array(
      z.object({
        ply: z.number().int().min(1),
        san: z.string().min(1),
        uci: z.string().min(4).max(5),
        fenAfter: z.string().min(10),
        evalCp: z.number().nullable(),
        mate: z.number().nullable(),
        winProb: z.number().min(0).max(100),
        bestMove: z.string().nullable(),
        classification: z
          .enum([
            'book',
            'brilliant',
            'great',
            'best',
            'excellent',
            'good',
            'inaccuracy',
            'mistake',
            'blunder',
            'miss',
          ])
          .nullable(),
        timeMs: z.number().int().min(0).default(0),
      }),
    )
    .default([]),
});
export type SaveGamePayload = z.infer<typeof SaveGamePayloadSchema>;

export interface OfflineStatusReport {
  blockedRequestsCount: number;
  blockedUrlsSample: string[];
  cspActive: boolean;
  storageDirectory: string;
  activeEngineBinary: string;
  cpuFeatures: string[];
  systemRamGb: number;
  llmStatus: 'ready' | 'missing-model' | 'template-only' | 'error';
  llmModelName: string;
}
