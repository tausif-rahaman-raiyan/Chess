import { create } from 'zustand';
import { Chess, Square } from 'chess.js';
import { EngineEvaluation, RecordedMove } from '../shared/types';
import { useAppStore } from './useAppStore';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface AnalysisState {
  fen: string;
  initialFen: string;
  moves: RecordedMove[];
  viewPly: number;
  flipped: boolean;
  engineRunning: boolean;
  depthTarget: number;
  multiPv: number;
  showBestArrow: boolean;
  showThreatArrow: boolean;
  showHangingSquares: boolean;
  evaluation: EngineEvaluation | null;
  threatEval: EngineEvaluation | null;
  previewLineUci: string | null;

  setFen: (fen: string) => void;
  makeMove: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => boolean;
  setViewPly: (ply: number) => void;
  toggleEngine: () => void;
  setDepthTarget: (d: number) => void;
  setMultiPv: (m: number) => void;
  toggleBestArrow: () => void;
  toggleThreatArrow: () => void;
  toggleHangingSquares: () => void;
  flipBoard: () => void;
  setPreviewLineUci: (uci: string | null) => void;
  runAnalysisNow: () => Promise<void>;
  loadPgnMoves: (initialFen: string, moves: RecordedMove[]) => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  fen: START_FEN,
  initialFen: START_FEN,
  moves: [],
  viewPly: 0,
  flipped: false,
  engineRunning: true,
  depthTarget: 20,
  multiPv: 3,
  showBestArrow: true,
  showThreatArrow: true,
  showHangingSquares: true,
  evaluation: null,
  threatEval: null,
  previewLineUci: null,

  setFen: (fen) => {
    try {
      const c = new Chess(fen);
      set({
        fen: c.fen(),
        initialFen: c.fen(),
        moves: [],
        viewPly: 0,
        previewLineUci: null,
      });
      void get().runAnalysisNow();
    } catch {
      useAppStore.getState().showToast('Invalid FEN string');
    }
  },

  makeMove: (from, to, promotion = 'q') => {
    const state = get();
    const chess = new Chess(state.fen);
    const mv = chess.move({ from, to, promotion });
    if (!mv) return false;

    const baseMoves = state.moves.slice(0, state.viewPly);
    const nextMove: RecordedMove = {
      ply: baseMoves.length + 1,
      san: mv.san,
      uci: `${mv.from}${mv.to}${mv.promotion ?? ''}`,
      fenAfter: chess.fen(),
      evalCp: null,
      mate: null,
      winProb: 50,
      bestMove: null,
      classification: null,
      timeMs: 0,
    };
    const nextMoves = [...baseMoves, nextMove];
    set({
      fen: chess.fen(),
      moves: nextMoves,
      viewPly: nextMoves.length,
      previewLineUci: null,
    });
    void get().runAnalysisNow();
    return true;
  },

  setViewPly: (ply) => {
    const state = get();
    const clamped = Math.max(0, Math.min(state.moves.length, ply));
    const targetFen = clamped === 0 ? state.initialFen : state.moves[clamped - 1]!.fenAfter;
    set({ viewPly: clamped, fen: targetFen, previewLineUci: null });
    void get().runAnalysisNow();
  },

  toggleEngine: () => {
    const next = !get().engineRunning;
    set({ engineRunning: next });
    if (next) {
      void get().runAnalysisNow();
    } else if (window.offlineChess) {
      void window.offlineChess.stopEngine();
    }
  },

  setDepthTarget: (d) => {
    set({ depthTarget: d });
    void get().runAnalysisNow();
  },

  setMultiPv: (m) => {
    set({ multiPv: m });
    void get().runAnalysisNow();
  },

  toggleBestArrow: () => set({ showBestArrow: !get().showBestArrow }),
  toggleThreatArrow: () => set({ showThreatArrow: !get().showThreatArrow }),
  toggleHangingSquares: () => set({ showHangingSquares: !get().showHangingSquares }),
  flipBoard: () => set({ flipped: !get().flipped }),
  setPreviewLineUci: (uci) => set({ previewLineUci: uci }),

  runAnalysisNow: async () => {
    const state = get();
    if (!state.engineRunning || !window.offlineChess) return;

    const targetFen = state.fen;
    try {
      const ev = await window.offlineChess.analyzePosition({
        fen: targetFen,
        depth: state.depthTarget,
        multipv: state.multiPv,
      });
      if (get().fen === targetFen) {
        set({ evaluation: ev });
      }

      // Compute opponent threat if turn can be flipped safely
      const parts = targetFen.split(' ');
      if (parts.length >= 4) {
        parts[1] = parts[1] === 'w' ? 'b' : 'w';
        parts[3] = '-';
        const flippedFen = parts.join(' ');
        try {
          new Chess(flippedFen);
          const threatEv = await window.offlineChess.analyzePosition({
            fen: flippedFen,
            depth: Math.min(14, state.depthTarget),
            multipv: 1,
          });
          if (get().fen === targetFen) {
            set({ threatEval: threatEv });
          }
        } catch {
          // Null-move fen invalid (e.g., side to move already in check)
          set({ threatEval: null });
        }
      }
    } catch {
      // Ignore canceled searches
    }
  },

  loadPgnMoves: (initialFen, moves) => {
    const lastFen = moves.length > 0 ? moves[moves.length - 1]!.fenAfter : initialFen;
    set({
      initialFen,
      fen: lastFen,
      moves,
      viewPly: moves.length,
      previewLineUci: null,
    });
    void get().runAnalysisNow();
  },
}));
