import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Download,
  FlipVertical,
  Pause,
  Play,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Square } from 'chess.js';
import { exportAnnotatedPgn, parseSinglePgn } from '../../core/pgn';
import { buildPositionFacts } from '../../core/tactics';
import { Board, BoardArrow } from '../../components/Board';
import { EvalBar } from '../../components/EvalBar';
import { ExplainPanel } from '../../components/ExplainPanel';
import { MoveList } from '../../components/MoveList';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { useAppStore } from '../../store/useAppStore';
import { useGameStore } from '../../store/useGameStore';

export const AnalysisView: React.FC = () => {
  const { settings, updateSettings, isFocusMode, showToast } = useAppStore();
  const {
    fen,
    initialFen,
    moves,
    viewPly,
    flipped,
    engineRunning,
    depthTarget,
    multiPv,
    showBestArrow,
    showThreatArrow,
    showHangingSquares,
    evaluation,
    threatEval,
    previewLineUci,
    setFen,
    makeMove,
    setViewPly,
    toggleEngine,
    setDepthTarget,
    setMultiPv,
    toggleBestArrow,
    toggleThreatArrow,
    toggleHangingSquares,
    flipBoard,
    setPreviewLineUci,
    runAnalysisNow,
    loadPgnMoves,
  } = useAnalysisStore();

  const [fenDraft, setFenDraft] = useState(fen);

  useEffect(() => {
    setFenDraft(fen);
  }, [fen]);

  useEffect(() => {
    void runAnalysisNow();
  }, [runAnalysisNow]);

  const boardPx = useMemo(() => {
    if (settings.boardAutoFit) {
      const availH = typeof window !== 'undefined' ? window.innerHeight - (isFocusMode ? 52 : 110) : 640;
      const availW = typeof window !== 'undefined' ? window.innerWidth - (isFocusMode ? 320 : 540) : 640;
      return Math.max(360, Math.min(900, Math.min(availH, availW)));
    }
    return settings.boardSizePx;
  }, [isFocusMode, settings.boardAutoFit, settings.boardSizePx]);

  const facts = useMemo(() => buildPositionFacts({ fen, evaluation }), [fen, evaluation]);

  const arrows = useMemo<BoardArrow[]>(() => {
    const list: BoardArrow[] = [];
    if (previewLineUci && previewLineUci.length >= 4) {
      list.push({
        from: previewLineUci.slice(0, 2) as Square,
        to: previewLineUci.slice(2, 4) as Square,
        color: '#38bdf8',
      });
    }
    if (showBestArrow && evaluation?.bestMoveUci && evaluation.bestMoveUci.length >= 4) {
      list.push({
        from: evaluation.bestMoveUci.slice(0, 2) as Square,
        to: evaluation.bestMoveUci.slice(2, 4) as Square,
        color: '#81b64c',
      });
    }
    if (showThreatArrow && threatEval?.bestMoveUci && threatEval.bestMoveUci.length >= 4) {
      list.push({
        from: threatEval.bestMoveUci.slice(0, 2) as Square,
        to: threatEval.bestMoveUci.slice(2, 4) as Square,
        color: '#ef4444',
        widthScale: 0.78,
      });
    }
    return list;
  }, [evaluation, previewLineUci, showBestArrow, showThreatArrow, threatEval]);

  const highlightedSquares = useMemo<Square[]>(() => {
    if (!showHangingSquares) return [];
    return facts.hangingPieces.map((h) => h.square as Square);
  }, [facts.hangingPieces, showHangingSquares]);

  const handleImportPgn = async () => {
    if (!window.offlineChess) return;
    const res = await window.offlineChess.importPgnFile();
    if (res.canceled || !res.content) return;
    try {
      const parsed = parseSinglePgn(res.content);
      loadPgnMoves('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', parsed.moves);
      showToast('PGN loaded into Analysis Board');
    } catch {
      showToast('Failed to parse PGN file');
    }
  };

  const handleExportPgn = async () => {
    if (!window.offlineChess) return;
    const pgn = exportAnnotatedPgn({
      white: 'Analysis White',
      black: 'Analysis Black',
      result: '*',
      date: new Date().toISOString().slice(0, 10),
      timeControl: 'unlimited',
      openingEco: 'A00',
      openingName: 'Analysis Session',
      initialFen:
        initialFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
          ? initialFen
          : undefined,
      moves,
      includeAnnotations: true,
    });
    await window.offlineChess.exportPgnFile(pgn, 'OfflineChess-Analysis.pgn');
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 16,
        overflow: 'hidden',
      }}
    >
      <EvalBar
        scoreCp={evaluation?.lines[0]?.scoreCp ?? null}
        mateIn={evaluation?.lines[0]?.mateIn ?? null}
        turn={fen.split(' ')[1] === 'b' ? 'b' : 'w'}
        flipped={flipped}
        heightPx={boardPx}
      />

      <Board
        fen={fen}
        flipped={flipped}
        sizePx={boardPx}
        arrows={arrows}
        highlightedSquares={highlightedSquares}
        onMoveAttempt={(from, to, promo) => makeMove(from, to, promo)}
        onSquareInspect={(sq) => {
          useGameStore.setState({ fen, initialFen, moves, viewPly, currentEval: evaluation });
          void useGameStore.getState().openExplainForSquare(sq);
        }}
        onWheelResize={(delta) => {
          const next = Math.max(320, Math.min(1200, boardPx + delta));
          void updateSettings({ boardAutoFit: false, boardSizePx: next });
        }}
      />

      {/* Right Analysis Panel (Compact Best Move + Lines kept even in Focus Mode!) */}
      <div
        className="card"
        style={{
          width: isFocusMode ? 290 : 370,
          height: boardPx,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
        }}
      >
        {/* Engine Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <button
            type="button"
            className={engineRunning ? 'btn btn-accent' : 'btn'}
            onClick={toggleEngine}
          >
            {engineRunning ? <Pause size={14} /> : <Play size={14} />}
            {engineRunning ? `Depth ${evaluation?.depth ?? 0}/${depthTarget}` : 'Paused'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <span>Lines:</span>
            <select
              value={multiPv}
              onChange={(e) => setMultiPv(Number(e.target.value))}
              className="input-field"
              style={{ padding: '4px 6px' }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              value={depthTarget}
              onChange={(e) => setDepthTarget(Number(e.target.value))}
              className="input-field"
              style={{ padding: '4px 6px' }}
            >
              {[14, 18, 22, 26, 30].map((d) => (
                <option key={d} value={d}>
                  D{d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Best Move Callout */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(129, 182, 76, 0.14)',
            border: '1px solid rgba(129, 182, 76, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#a3e635' }}>BEST MOVE</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16 }}>
            {evaluation?.bestMoveSan || 'Calculating...'}
          </span>
        </div>

        {/* MultiPV Principal Variations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(evaluation?.lines ?? []).map((line) => {
            const scoreStr =
              line.mateIn !== null
                ? `#${line.mateIn}`
                : line.scoreCp !== null
                  ? `${line.scoreCp >= 0 ? '+' : ''}${(line.scoreCp / 100).toFixed(2)}`
                  : '0.00';
            return (
              <div
                key={line.multipv}
                onMouseEnter={() => line.pvUci[0] && setPreviewLineUci(line.pvUci[0])}
                onMouseLeave={() => setPreviewLineUci(null)}
                style={{
                  padding: '6px 9px',
                  borderRadius: 8,
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: 52,
                    fontWeight: 800,
                    color: 'var(--accent)',
                    marginRight: 8,
                  }}
                >
                  {scoreStr}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {line.pvSan.slice(0, 7).join(' ')}
                </span>
              </div>
            );
          })}
        </div>

        {!isFocusMode && (
          <>
            {/* Visual Overlays Toggles */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                type="button"
                className="btn"
                onClick={toggleBestArrow}
                style={{ fontSize: 11.5, borderColor: showBestArrow ? '#81b64c' : undefined }}
              >
                Best Arrow
              </button>
              <button
                type="button"
                className="btn"
                onClick={toggleThreatArrow}
                style={{ fontSize: 11.5, borderColor: showThreatArrow ? '#ef4444' : undefined }}
              >
                <ShieldAlert size={13} /> Threat
              </button>
              <button
                type="button"
                className="btn"
                onClick={toggleHangingSquares}
                style={{ fontSize: 11.5, borderColor: showHangingSquares ? '#f59e0b' : undefined }}
              >
                Hanging ({facts.hangingPieces.length})
              </button>
              <button type="button" className="btn" onClick={flipBoard} style={{ fontSize: 11.5 }}>
                <FlipVertical size={13} /> Flip
              </button>
            </div>

            {/* Variation Move List */}
            <div
              style={{
                flex: 1,
                background: 'var(--bg-app)',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                overflowY: 'auto',
              }}
            >
              <MoveList moves={moves} viewPly={viewPly} onSelectPly={setViewPly} />
            </div>

            {/* FEN & PGN Tools */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={fenDraft}
                onChange={(e) => setFenDraft(e.target.value)}
                className="input-field"
                style={{ flex: 1, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}
              />
              <button type="button" className="btn" onClick={() => setFen(fenDraft)}>
                Set FEN
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void navigator.clipboard?.writeText(fen);
                  showToast('FEN copied to clipboard');
                }}
                title="Copy FEN"
              >
                <Copy size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => void handleImportPgn()}>
                <Upload size={14} /> Import PGN
              </button>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => void handleExportPgn()}>
                <Download size={14} /> Export PGN
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  useGameStore.setState({ fen, initialFen, moves, viewPly, currentEval: evaluation });
                  void useGameStore.getState().openExplainForSquare('d4');
                }}
              >
                <Sparkles size={14} /> Explain
              </button>
            </div>
          </>
        )}
      </div>

      <ExplainPanel />
    </div>
  );
};
