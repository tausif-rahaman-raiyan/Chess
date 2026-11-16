import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Handshake,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Square } from 'chess.js';
import { describeRating, RATING_PRESETS } from '../../../electron/engine/strength';
import { MoveClassification, PieceColor } from '../../shared/types';
import { BADGE_META, BadgeChip } from '../../components/BadgeIcon';
import { Board, BoardArrow } from '../../components/Board';
import { EvalBar } from '../../components/EvalBar';
import { ExplainPanel } from '../../components/ExplainPanel';
import { MoveList } from '../../components/MoveList';
import { useAppStore } from '../../store/useAppStore';
import { useGameStore } from '../../store/useGameStore';

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PlayView: React.FC = () => {
  const { settings, updateSettings, isFocusMode, setActiveTab } = useAppStore();
  const {
    fen,
    playerColor,
    botRating,
    levelTestMode,
    timeControl,
    whiteClockMs,
    blackClockMs,
    moves,
    viewPly,
    isBotThinking,
    gameOverReason,
    gameResult,
    latestPlayerBadge,
    lastMoveSquares,
    animatedVisual,
    hintRevealed,
    currentEval,
    previewMoveUci,
    startNewGame,
    makeUserMove,
    revealHint,
    takebackMove,
    resignGame,
    offerDraw,
    setViewPly,
    setBotRating,
    openExplainForSquare,
    openExplainForMove,
    saveCurrentGame,
    tickClock,
  } = useGameStore();

  const [selectedColor, setSelectedColor] = useState<PieceColor | 'random'>('w');
  const [selectedTc, setSelectedTc] = useState<string>('10+0');
  const [customFenInput, setCustomFenInput] = useState('');
  const [showCustomFen, setShowCustomFen] = useState(false);
  const [ratingInputStr, setRatingInputStr] = useState(String(botRating));
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  useEffect(() => {
    setRatingInputStr(String(botRating));
  }, [botRating]);

  useEffect(() => {
    if (gameOverReason) {
      setShowGameOverModal(true);
    }
  }, [gameOverReason]);

  useEffect(() => {
    const interval = setInterval(() => tickClock(250), 250);
    return () => clearInterval(interval);
  }, [tickClock]);

  const ratingMeta = useMemo(() => describeRating(botRating), [botRating]);

  // Compute responsive board size
  const boardPx = useMemo(() => {
    if (settings.boardAutoFit) {
      const availH = typeof window !== 'undefined' ? window.innerHeight - (isFocusMode ? 52 : 128) : 640;
      const availW = typeof window !== 'undefined' ? window.innerWidth - (isFocusMode ? 220 : 520) : 640;
      return Math.max(360, Math.min(920, Math.min(availH, availW)));
    }
    return settings.boardSizePx;
  }, [isFocusMode, settings.boardAutoFit, settings.boardSizePx]);

  // STRICT SPOILER-FREE RULE:
  // Never show best-move arrows during live play unless user explicitly clicked Hint or hovered an Idea in ExplainPanel!
  const visibleArrows = useMemo<BoardArrow[]>(() => {
    const list: BoardArrow[] = [];
    if (previewMoveUci && previewMoveUci.length >= 4) {
      list.push({
        from: previewMoveUci.slice(0, 2) as Square,
        to: previewMoveUci.slice(2, 4) as Square,
        color: '#38bdf8',
      });
      return list;
    }
    if ((hintRevealed || settings.assistModeInPlay) && currentEval?.bestMoveUci && currentEval.bestMoveUci.length >= 4) {
      list.push({
        from: currentEval.bestMoveUci.slice(0, 2) as Square,
        to: currentEval.bestMoveUci.slice(2, 4) as Square,
        color: '#81b64c',
      });
    }
    return list;
  }, [currentEval, hintRevealed, previewMoveUci, settings.assistModeInPlay]);

  // Count player's badge categories for Game Over summary
  const badgeSummary = useMemo(() => {
    const counts: Partial<Record<MoveClassification, number>> = {};
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]!;
      const isMine =
        (i % 2 === 0 && playerColor === 'w') || (i % 2 === 1 && playerColor === 'b');
      if (isMine && m.classification) {
        counts[m.classification] = (counts[m.classification] ?? 0) + 1;
      }
    }
    return counts;
  }, [moves, playerColor]);

  const topColor: PieceColor = playerColor === 'w' ? 'b' : 'w';
  const bottomColor: PieceColor = playerColor;
  const topClock = topColor === 'w' ? whiteClockMs : blackClockMs;
  const bottomClock = bottomColor === 'w' ? whiteClockMs : blackClockMs;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: isFocusMode ? 12 : 16,
        overflow: 'hidden',
      }}
    >
      {/* Left: Eval Bar (shown in Focus Mode, Analysis, or when Hint revealed) */}
      {(isFocusMode || hintRevealed || settings.assistModeInPlay) && (
        <EvalBar
          scoreCp={currentEval?.lines[0]?.scoreCp ?? null}
          mateIn={currentEval?.lines[0]?.mateIn ?? null}
          turn={fen.split(' ')[1] === 'b' ? 'b' : 'w'}
          flipped={playerColor === 'b'}
          heightPx={boardPx}
        />
      )}

      {/* Center: Player Bars + Chessboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Opponent Top Bar */}
        <div style={playerBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'var(--bg-app)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: 'var(--accent)',
                fontSize: 12,
              }}
            >
              SF17
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Stockfish 17 ({botRating})</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {ratingMeta.label}
                </span>
              </div>
              {isBotThinking && (
                <div style={{ fontSize: 11, color: 'var(--accent)' }}>Thinking...</div>
              )}
            </div>
          </div>

          {timeControl !== 'unlimited' && (
            <div style={clockPillStyle}>{formatClock(topClock)}</div>
          )}
        </div>

        {/* Chessboard */}
        <Board
          fen={fen}
          flipped={playerColor === 'b'}
          interactive={!isBotThinking && !gameOverReason && viewPly === moves.length}
          sizePx={boardPx}
          lastMove={lastMoveSquares}
          animatedMove={animatedVisual}
          arrows={visibleArrows}
          playerBadge={viewPly === moves.length ? latestPlayerBadge : null}
          onMoveAttempt={(from, to, promo) => makeUserMove(from, to, promo)}
          onSquareInspect={(sq) => {
            if (settings.explanationMode !== 'off') {
              void openExplainForSquare(sq);
            }
          }}
          onWheelResize={(delta) => {
            const next = Math.max(320, Math.min(1200, boardPx + delta));
            void updateSettings({ boardAutoFit: false, boardSizePx: next });
          }}
        />

        {/* Human Player Bottom Bar */}
        <div style={playerBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'var(--accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: 'var(--accent)',
                fontSize: 12,
              }}
            >
              YOU
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                You ({playerColor === 'w' ? 'White' : 'Black'})
              </div>
              {latestPlayerBadge && (
                <div style={{ fontSize: 11, color: BADGE_META[latestPlayerBadge.classification].bg, fontWeight: 700 }}>
                  Last move: {BADGE_META[latestPlayerBadge.classification].label}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => void revealHint()}
              title="Reveal Best Move Hint"
              style={{
                borderColor: hintRevealed ? '#81b64c' : undefined,
                color: hintRevealed ? '#a3e635' : undefined,
              }}
            >
              <Lightbulb size={15} />
              {hintRevealed && currentEval?.bestMoveSan
                ? `Best: ${currentEval.bestMoveSan}`
                : 'Hint'}
            </button>

            {timeControl !== 'unlimited' && (
              <div style={clockPillStyle}>{formatClock(bottomClock)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Right Control Sidebar (Hidden in Focus Mode so only Board + Analysis + Best Move stay visible) */}
      {!isFocusMode && (
        <div
          className="card"
          style={{
            width: 340,
            height: boardPx + 96,
            maxHeight: '100%',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
          }}
        >
          {/* Opponent Strength Calibration (0 - 3500) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={14} color="var(--accent)" /> OPPONENT RATING (0–3500)
              </span>
              <input
                type="number"
                min={0}
                max={3500}
                value={ratingInputStr}
                onChange={(e) => {
                  setRatingInputStr(e.target.value);
                  const num = Number(e.target.value);
                  if (!Number.isNaN(num)) setBotRating(num);
                }}
                className="input-field"
                style={{ width: 74, textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={3500}
              step={10}
              value={botRating}
              onChange={(e) => setBotRating(Number(e.target.value))}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {RATING_PRESETS.map((preset) => (
                <button
                  key={preset.rating}
                  type="button"
                  onClick={() => setBotRating(preset.rating)}
                  style={{
                    padding: '3px 7px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: botRating === preset.rating ? 'var(--accent)' : 'var(--bg-app)',
                    color: botRating === preset.rating ? '#06131f' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {preset.label} {preset.rating}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              <strong>{ratingMeta.label}:</strong> {ratingMeta.description}
            </div>
          </div>

          {/* Match Setup Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value as PieceColor | 'random')}
              className="input-field"
            >
              <option value="w">Play White</option>
              <option value="b">Play Black</option>
              <option value="random">Random Side</option>
            </select>

            <select
              value={selectedTc}
              onChange={(e) => setSelectedTc(e.target.value)}
              className="input-field"
            >
              <option value="1+0">1+0 Bullet</option>
              <option value="3+0">3+0 Blitz</option>
              <option value="3+2">3+2 Blitz</option>
              <option value="5+0">5+0 Blitz</option>
              <option value="10+0">10+0 Rapid</option>
              <option value="15+10">15+10 Rapid</option>
              <option value="30+0">30+0 Classical</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() =>
                void startNewGame({
                  color: selectedColor,
                  rating: botRating,
                  timeControl: selectedTc,
                })
              }
            >
              <Play size={15} /> New Match
            </button>

            <button
              type="button"
              className="btn"
              onClick={() =>
                void startNewGame({
                  color: selectedColor,
                  rating: botRating,
                  timeControl: selectedTc,
                  levelTestMode: !levelTestMode,
                })
              }
              title="Adaptive Level Test automatically adjusts bot rating after each game"
              style={{
                borderColor: levelTestMode ? '#f59e0b' : undefined,
                color: levelTestMode ? '#fbbf24' : undefined,
              }}
            >
              Level Test {levelTestMode ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setShowCustomFen((v) => !v)}
              title="Setup Custom FEN Position"
            >
              FEN
            </button>
          </div>

          {showCustomFen && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Paste custom FEN..."
                value={customFenInput}
                onChange={(e) => setCustomFenInput(e.target.value)}
                className="input-field"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  void startNewGame({ customFen: customFenInput, color: selectedColor, rating: botRating });
                  setShowCustomFen(false);
                }}
              >
                Load
              </button>
            </div>
          )}

          {/* Move List */}
          <div
            style={{
              flex: 1,
              background: 'var(--bg-app)',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text-secondary)',
              }}
            >
              <span>MOVES (Click any move to explain)</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setViewPly(viewPly - 1)}
                  disabled={viewPly <= 0}
                  style={navArrowBtn}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewPly(viewPly + 1)}
                  disabled={viewPly >= moves.length}
                  style={navArrowBtn}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <MoveList
              moves={moves}
              viewPly={viewPly}
              onSelectPly={setViewPly}
              onExplainMove={(ply) => void openExplainForMove(ply)}
            />
          </div>

          {/* Match Action Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            <button
              type="button"
              className="btn"
              onClick={takebackMove}
              disabled={moves.length === 0 || isBotThinking}
              title="Takeback / Retry"
            >
              <RotateCcw size={14} /> Undo
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void openExplainForSquare('e4')}
              title="Explain Current Position"
            >
              <HelpCircle size={14} /> Coach
            </button>
            <button
              type="button"
              className="btn"
              onClick={offerDraw}
              disabled={Boolean(gameOverReason)}
              title="Offer Draw"
            >
              <Handshake size={14} /> Draw
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={resignGame}
              disabled={Boolean(gameOverReason)}
              title="Resign Game"
            >
              <Flag size={14} /> Resign
            </button>
          </div>
        </div>
      )}

      {/* Right Slide-Over Click-to-Explain Drawer */}
      <ExplainPanel />

      {/* Game Over Summary Modal */}
      {gameOverReason && showGameOverModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
        >
          <div
            className="card"
            style={{
              width: 420,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: 'center',
            }}
          >
            <Trophy size={38} color="#f59e0b" style={{ margin: '0 auto' }} />
            <div>
              <h2 style={{ fontSize: 21, fontWeight: 800 }}>{gameResult}</h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                {gameOverReason}
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {(Object.entries(badgeSummary) as Array<[MoveClassification, number]>).map(
                ([cls, count]) => (
                  <div
                    key={cls}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
                  >
                    <BadgeChip classification={cls} size={20} />
                    <span>
                      {BADGE_META[cls].label}: {count}
                    </span>
                  </div>
                ),
              )}
              {Object.keys(badgeSummary).length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Match completed and saved to your local library.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowGameOverModal(false);
                  void saveCurrentGame(false);
                  setActiveTab('saved');
                }}
              >
                <Sparkles size={15} /> Game Review
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowGameOverModal(false);
                  void startNewGame({ color: selectedColor, rating: botRating, timeControl: selectedTc });
                }}
              >
                <Save size={15} /> Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const playerBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  borderRadius: 10,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
};

const clockPillStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 8,
  background: 'var(--bg-app)',
  border: '1px solid var(--border-strong)',
  fontFamily: 'var(--font-mono)',
  fontWeight: 800,
  fontSize: 15,
};

const navArrowBtn: React.CSSProperties = {
  background: 'var(--bg-surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 5,
  padding: '2px 5px',
  cursor: 'pointer',
};
