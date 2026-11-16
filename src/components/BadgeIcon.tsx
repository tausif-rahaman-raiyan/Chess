import React from 'react';
import { MoveClassification } from '../shared/types';

export interface BadgeMeta {
  symbol: string;
  label: string;
  bg: string;
  fg: string;
}

export const BADGE_META: Record<MoveClassification, BadgeMeta> = {
  brilliant: { symbol: '!!', label: 'Brilliant', bg: '#26c2a3', fg: '#ffffff' },
  great: { symbol: '!', label: 'Great Move', bg: '#5c8bb0', fg: '#ffffff' },
  best: { symbol: '★', label: 'Best Move', bg: '#96bc4b', fg: '#ffffff' },
  excellent: { symbol: '✓', label: 'Excellent', bg: '#96af8b', fg: '#ffffff' },
  good: { symbol: '○', label: 'Good', bg: '#81b64c', fg: '#ffffff' },
  inaccuracy: { symbol: '?!', label: 'Inaccuracy', bg: '#f7c631', fg: '#18181b' },
  mistake: { symbol: '?', label: 'Mistake', bg: '#e58f2a', fg: '#ffffff' },
  blunder: { symbol: '??', label: 'Blunder', bg: '#ca3431', fg: '#ffffff' },
  miss: { symbol: '✕', label: 'Missed Win', bg: '#ff7769', fg: '#ffffff' },
  book: { symbol: '📖', label: 'Book Move', bg: '#a88865', fg: '#ffffff' },
};

export const BadgeChip: React.FC<{
  classification: MoveClassification;
  size?: number;
  animated?: boolean;
}> = ({ classification, size = 24, animated = false }) => {
  const meta = BADGE_META[classification];
  return (
    <span
      title={meta.label}
      className={animated ? 'anim-badge-pop' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: meta.bg,
        color: meta.fg,
        fontSize: Math.round(size * 0.48),
        fontWeight: 900,
        boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
        border: '1.5px solid rgba(255,255,255,0.85)',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {meta.symbol}
    </span>
  );
};
