import React from 'react';
import { RecordedMove } from '../shared/types';
import { BadgeChip } from './BadgeIcon';

interface MoveListProps {
  moves: RecordedMove[];
  viewPly: number;
  onSelectPly: (ply: number) => void;
  onExplainMove?: (ply: number) => void;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  viewPly,
  onSelectPly,
  onExplainMove,
}) => {
  const pairs: Array<{ moveNumber: number; white?: RecordedMove; black?: RecordedMove }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
        maxHeight: 280,
        padding: '4px 6px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
      }}
    >
      {pairs.length === 0 && (
        <div style={{ padding: 14, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          No moves played yet. Make a move on the board!
        </div>
      )}
      {pairs.map((pair) => (
        <div
          key={pair.moveNumber}
          style={{
            display: 'grid',
            gridTemplateColumns: '38px 1fr 1fr',
            alignItems: 'center',
            padding: '3px 6px',
            borderRadius: 6,
            background: pair.moveNumber % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{pair.moveNumber}.</span>
          {renderMoveCell(pair.white, viewPly, onSelectPly, onExplainMove)}
          {renderMoveCell(pair.black, viewPly, onSelectPly, onExplainMove)}
        </div>
      ))}
    </div>
  );
};

function renderMoveCell(
  move: RecordedMove | undefined,
  viewPly: number,
  onSelectPly: (ply: number) => void,
  onExplainMove?: (ply: number) => void,
) {
  if (!move) return <span />;
  const active = move.ply === viewPly;
  return (
    <button
      type="button"
      onClick={() => {
        onSelectPly(move.ply);
        onExplainMove?.(move.ply);
      }}
      title="Click to jump & explain this move"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-primary)',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span>{move.san}</span>
      {move.classification && <BadgeChip classification={move.classification} size={17} />}
    </button>
  );
}
