import React from 'react';
import { PieceColor } from '../shared/types';
import { winPctFromScore } from '../core/winProbability';

interface EvalBarProps {
  scoreCp: number | null;
  mateIn: number | null;
  turn: PieceColor;
  flipped?: boolean;
  heightPx: number;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  scoreCp,
  mateIn,
  turn,
  flipped = false,
  heightPx,
}) => {
  const whiteWinPct = winPctFromScore(scoreCp, mateIn, 'w', turn);
  const clampedPct = Math.max(4, Math.min(96, whiteWinPct));

  let label = '0.0';
  if (mateIn !== null) {
    const whiteMate = turn === 'w' ? mateIn : -mateIn;
    label = `${whiteMate > 0 ? '+' : '-'}M${Math.abs(mateIn)}`;
  } else if (scoreCp !== null) {
    const whiteCp = turn === 'w' ? scoreCp : -scoreCp;
    const pawns = whiteCp / 100;
    label = `${pawns >= 0 ? '+' : ''}${pawns.toFixed(1)}`;
  }

  const whiteAdvantage = whiteWinPct >= 50;

  return (
    <div
      aria-label={`Position evaluation ${label}`}
      style={{
        width: 30,
        height: heightPx,
        borderRadius: 8,
        overflow: 'hidden',
        background: '#262522',
        border: '1px solid var(--border-strong)',
        position: 'relative',
        display: 'flex',
        flexDirection: flipped ? 'column' : 'column-reverse',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: `${clampedPct}%`,
          background: '#f5f5f4',
          transition: 'height 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 10,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          padding: '4px 1px',
          ...(whiteAdvantage !== flipped
            ? { bottom: 3, color: '#18181b' }
            : { top: 3, color: '#f5f5f4' }),
        }}
      >
        {label}
      </span>
    </div>
  );
};
