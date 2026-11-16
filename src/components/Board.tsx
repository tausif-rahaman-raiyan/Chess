import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { MoveClassification, PieceColor } from '../shared/types';
import { useAppStore } from '../store/useAppStore';
import { AnimatedMoveVisual } from '../store/useGameStore';
import { BadgeChip } from './BadgeIcon';
import { getBoardTheme } from './board/boardThemes';
import { ChessPieceSvg } from './pieces/pieceSets';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

export interface BoardArrow {
  from: Square;
  to: Square;
  color: string;
  widthScale?: number;
}

interface BoardProps {
  fen: string;
  flipped?: boolean;
  interactive?: boolean;
  sizePx: number;
  lastMove?: { from: Square; to: Square } | null;
  animatedMove?: AnimatedMoveVisual | null;
  arrows?: BoardArrow[];
  highlightedSquares?: Square[];
  playerBadge?: { square: Square; classification: MoveClassification; ply: number } | null;
  onMoveAttempt?: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => Promise<boolean> | boolean;
  onSquareInspect?: (square: Square) => void;
  onWheelResize?: (deltaPx: number) => void;
}

export const Board: React.FC<BoardProps> = ({
  fen,
  flipped = false,
  interactive = true,
  sizePx,
  lastMove = null,
  animatedMove = null,
  arrows = [],
  highlightedSquares = [],
  playerBadge = null,
  onMoveAttempt,
  onSquareInspect,
  onWheelResize,
}) => {
  const { settings } = useAppStore();
  const theme = getBoardTheme(settings.boardTheme);

  const [selectedSq, setSelectedSq] = useState<Square | null>(null);
  const [dragFromSq, setDragFromSq] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square; color: PieceColor } | null>(null);
  const [shakeBoard, setShakeBoard] = useState(false);
  const [glideStyle, setGlideStyle] = useState<{
    pieceColor: PieceColor;
    pieceType: PieceSymbol;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    active: boolean;
  } | null>(null);

  const lastAnimIdRef = useRef<number | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const legalMovesFromSelected = useMemo(() => {
    if (!selectedSq) return [];
    return chess.moves({ square: selectedSq, verbose: true }) as Move[];
  }, [chess, selectedSq]);

  const legalTargetsSet = useMemo(
    () => new Set(legalMovesFromSelected.map((m) => m.to)),
    [legalMovesFromSelected],
  );

  // Smooth slow gliding animation when a move occurs
  useEffect(() => {
    if (!animatedMove || animatedMove.id === lastAnimIdRef.current) return;
    lastAnimIdRef.current = animatedMove.id;
    const duration = settings.reduceMotion ? 0 : settings.animationDurationMs;
    if (duration <= 0) return;

    const sqSize = sizePx / 8;
    const getCoords = (sq: Square) => {
      const fIdx = FILES.indexOf(sq[0] as (typeof FILES)[number]);
      const rIdx = RANKS.indexOf(sq[1] as (typeof RANKS)[number]);
      const col = flipped ? 7 - fIdx : fIdx;
      const row = flipped ? 7 - rIdx : rIdx;
      return { x: col * sqSize, y: row * sqSize };
    };

    const start = getCoords(animatedMove.from);
    const end = getCoords(animatedMove.to);
    setGlideStyle({
      pieceColor: animatedMove.pieceColor,
      pieceType: animatedMove.pieceType,
      fromX: start.x,
      fromY: start.y,
      toX: end.x,
      toY: end.y,
      active: false,
    });

    const raf = requestAnimationFrame(() => {
      setGlideStyle((prev) => (prev ? { ...prev, active: true } : null));
    });
    const timer = setTimeout(() => {
      setGlideStyle(null);
    }, duration + 30);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [animatedMove, flipped, settings.animationDurationMs, settings.reduceMotion, sizePx]);

  const triggerIllegalShake = () => {
    setShakeBoard(true);
    setTimeout(() => setShakeBoard(false), 340);
  };

  const executeMove = async (from: Square, to: Square) => {
    const piece = chess.get(from);
    if (!piece) return;

    const isPromotion =
      piece.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromotion && !settings.autoQueen) {
      const isLegalPromo = (chess.moves({ square: from, verbose: true }) as Move[]).some(
        (m) => m.to === to,
      );
      if (isLegalPromo) {
        setPendingPromotion({ from, to, color: piece.color });
        setSelectedSq(null);
        return;
      }
    }

    const ok = await onMoveAttempt?.(from, to, isPromotion ? 'q' : undefined);
    if (!ok) {
      triggerIllegalShake();
    }
    setSelectedSq(null);
  };

  const handleSquareClick = async (sq: Square) => {
    onSquareInspect?.(sq);
    if (!interactive) return;

    if (selectedSq && selectedSq !== sq) {
      if (legalTargetsSet.has(sq)) {
        await executeMove(selectedSq, sq);
        return;
      }
      const clickedPiece = chess.get(sq);
      if (clickedPiece && clickedPiece.color === chess.turn()) {
        setSelectedSq(sq);
        return;
      }
      if (settings.touchMoveRule) {
        triggerIllegalShake();
        return;
      }
      setSelectedSq(null);
      return;
    }

    const piece = chess.get(sq);
    if (piece && piece.color === chess.turn()) {
      setSelectedSq(selectedSq === sq ? null : sq);
    } else {
      setSelectedSq(null);
    }
  };

  const displayFiles = flipped ? [...FILES].reverse() : [...FILES];
  const displayRanks = flipped ? [...RANKS].reverse() : [...RANKS];
  const sqSize = sizePx / 8;

  const kingInCheckSq = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    for (const r of RANKS) {
      for (const f of FILES) {
        const sq = `${f}${r}` as Square;
        const p = chess.get(sq);
        if (p && p.type === 'k' && p.color === turn) return sq;
      }
    }
    return null;
  }, [chess]);

  const squareCenter = (sq: Square) => {
    const fIdx = displayFiles.indexOf(sq[0] as (typeof FILES)[number]);
    const rIdx = displayRanks.indexOf(sq[1] as (typeof RANKS)[number]);
    return {
      x: (fIdx + 0.5) * sqSize,
      y: (rIdx + 0.5) * sqSize,
    };
  };

  return (
    <div
      onWheel={(e) => {
        if (e.ctrlKey && onWheelResize) {
          e.preventDefault();
          onWheelResize(e.deltaY < 0 ? 32 : -32);
        }
      }}
      className={[
        shakeBoard ? 'anim-illegal-shake' : '',
        chess.isCheckmate() && settings.animateCheckmate ? 'anim-checkmate-ripple' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: sizePx,
        height: sizePx,
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        border: `3px solid ${theme.borderFrame}`,
        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.52)',
        backgroundImage: theme.textureOverlay,
        flexShrink: 0,
      }}
    >
      {/* 8x8 Square Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          width: '100%',
          height: '100%',
        }}
      >
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const sq = `${file}${rank}` as Square;
            const origFileIdx = FILES.indexOf(file);
            const origRankIdx = RANKS.indexOf(rank);
            const isLight = (origFileIdx + origRankIdx) % 2 === 0;
            const piece = chess.get(sq);
            const isSelected = selectedSq === sq;
            const isLastMove =
              settings.showLastMove && lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isLegalTarget = settings.showLegalDots && legalTargetsSet.has(sq);
            const isKingCheck = kingInCheckSq === sq;
            const isCustomHighlight = highlightedSquares.includes(sq);
            const isHiddenByGlide =
              glideStyle && !glideStyle.active && animatedMove?.to === sq;

            let bg = isLight ? theme.lightSquare : theme.darkSquare;
            if (isSelected) bg = theme.highlightSelected;
            else if (isLastMove) bg = isLight ? theme.lastMoveLight : theme.lastMoveDark;

            return (
              <div
                key={sq}
                onClick={() => void handleSquareClick(sq)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFromSq && dragFromSq !== sq) {
                    void executeMove(dragFromSq, sq);
                  }
                  setDragFromSq(null);
                }}
                className={isKingCheck && settings.animateCheckPulse ? 'anim-check-pulse' : undefined}
                style={{
                  position: 'relative',
                  backgroundColor: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: piece && piece.color === chess.turn() && interactive ? 'grab' : 'pointer',
                  boxShadow: isCustomHighlight
                    ? 'inset 0 0 0 3px rgba(244, 63, 94, 0.82)'
                    : undefined,
                }}
              >
                {/* Coordinates */}
                {settings.coordinates === 'inside' && fIdx === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: 4,
                      fontSize: Math.max(9, Math.round(sqSize * 0.16)),
                      fontWeight: 800,
                      color: isLight ? theme.coordLight : theme.coordDark,
                      pointerEvents: 'none',
                    }}
                  >
                    {rank}
                  </span>
                )}
                {settings.coordinates === 'inside' && rIdx === 7 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      right: 4,
                      fontSize: Math.max(9, Math.round(sqSize * 0.16)),
                      fontWeight: 800,
                      color: isLight ? theme.coordLight : theme.coordDark,
                      pointerEvents: 'none',
                    }}
                  >
                    {file}
                  </span>
                )}

                {/* Legal Move Indicator */}
                {isLegalTarget && !piece && (
                  <span
                    style={{
                      width: '30%',
                      height: '30%',
                      borderRadius: '50%',
                      background: theme.legalDot,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {isLegalTarget && piece && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 3,
                      borderRadius: '50%',
                      border: `4px solid ${theme.legalDot}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Chess Piece */}
                {piece && !isHiddenByGlide && (
                  <div
                    draggable={interactive && settings.dragAndClick !== 'click' && piece.color === chess.turn()}
                    onDragStart={() => {
                      setDragFromSq(sq);
                      setSelectedSq(sq);
                    }}
                    style={{
                      width: '86%',
                      height: '86%',
                      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.38))',
                      transform: isSelected ? 'scale(1.07) translateY(-2px)' : 'scale(1)',
                      transition: 'transform 160ms ease',
                      pointerEvents: 'none',
                    }}
                  >
                    <ChessPieceSvg setId={settings.pieceSet} color={piece.color} type={piece.type} />
                  </div>
                )}

                {/* Real-Time Move Quality Badge (Player's Own Moves Only) */}
                {playerBadge && playerBadge.square === sq && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      zIndex: 25,
                      pointerEvents: 'none',
                    }}
                  >
                    <BadgeChip
                      classification={playerBadge.classification}
                      size={Math.max(20, Math.round(sqSize * 0.34))}
                      animated={settings.animateBadgePop}
                    />
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Gliding Animated Piece Overlay */}
      {glideStyle && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: sqSize,
            height: sqSize,
            padding: sqSize * 0.07,
            transform: `translate3d(${glideStyle.active ? glideStyle.toX : glideStyle.fromX}px, ${
              glideStyle.active ? glideStyle.toY : glideStyle.fromY
            }px, 0)`,
            transition: glideStyle.active
              ? `transform ${settings.animationDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
              : 'none',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <ChessPieceSvg
            setId={settings.pieceSet}
            color={glideStyle.pieceColor}
            type={glideStyle.pieceType}
          />
        </div>
      )}

      {/* Vector Arrows Layer (Hints / Analysis / Preview Ideas) */}
      {arrows.length > 0 && (
        <svg
          viewBox={`0 0 ${sizePx} ${sizePx}`}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 18,
          }}
        >
          <defs>
            {arrows.map((ar, idx) => (
              <marker
                key={`mk-${idx}`}
                id={`arrow-head-${idx}`}
                markerWidth="4"
                markerHeight="4"
                refX="2.4"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 4 2, 0 4" fill={ar.color} />
              </marker>
            ))}
          </defs>
          {arrows.map((ar, idx) => {
            const p1 = squareCenter(ar.from);
            const p2 = squareCenter(ar.to);
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len < 1) return null;
            const shorten = sqSize * 0.22;
            const ex = p2.x - (dx / len) * shorten;
            const ey = p2.y - (dy / len) * shorten;
            const strokeW = Math.max(5, sqSize * 0.14 * (ar.widthScale ?? 1));
            return (
              <line
                key={`ar-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={ex}
                y2={ey}
                stroke={ar.color}
                strokeWidth={strokeW}
                strokeLinecap="round"
                opacity={0.86}
                markerEnd={`url(#arrow-head-${idx})`}
              />
            );
          })}
        </svg>
      )}

      {/* Pawn Promotion Picker Modal */}
      {pendingPromotion && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
          }}
        >
          <div
            className="card"
            style={{
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>Promote Pawn To</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['q', 'r', 'b', 'n'] as const).map((promo) => (
                <button
                  key={promo}
                  type="button"
                  onClick={async () => {
                    const { from, to } = pendingPromotion;
                    setPendingPromotion(null);
                    await onMoveAttempt?.(from, to, promo);
                  }}
                  style={{
                    width: 56,
                    height: 56,
                    padding: 6,
                    borderRadius: 10,
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-strong)',
                    cursor: 'pointer',
                  }}
                >
                  <ChessPieceSvg setId={settings.pieceSet} color={pendingPromotion.color} type={promo} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
