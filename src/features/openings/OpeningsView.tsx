import React, { useMemo, useState } from 'react';
import { BookOpen, Play, Search } from 'lucide-react';
import { Board } from '../../components/Board';
import { getAllIndexedOpenings, lookupOpeningByFen } from '../../core/openingBook';
import { useAppStore } from '../../store/useAppStore';
import { useGameStore } from '../../store/useGameStore';

export const OpeningsView: React.FC = () => {
  const { setActiveTab } = useAppStore();
  const { startNewGame } = useGameStore();
  const [search, setSearch] = useState('');
  const entries = useMemo(() => getAllIndexedOpenings(), []);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.eco.toLowerCase().includes(q) || e.name.toLowerCase().includes(q),
    );
  }, [entries, search]);

  const active = filtered[selectedIdx] ?? filtered[0];
  const fullFen = active ? `${active.fenKey} 0 1` : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const lookup = useMemo(() => lookupOpeningByFen(fullFen), [fullFen]);

  return (
    <div style={{ height: '100%', display: 'flex', gap: 20, padding: 20, overflow: 'hidden' }}>
      {/* Left Opening Tree List */}
      <div className="card" style={{ width: 380, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 16 }}>
          <BookOpen size={18} color="#f59e0b" /> Offline ECO Opening Explorer
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filter by ECO (C50) or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIdx(0);
            }}
            className="input-field"
            style={{ width: '100%', paddingLeft: 30 }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((item, idx) => (
            <button
              key={`${item.fenKey}-${idx}`}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                border: `1px solid ${idx === selectedIdx ? 'var(--accent)' : 'var(--border-subtle)'}`,
                background: idx === selectedIdx ? 'var(--accent-soft)' : 'var(--bg-surface-elevated)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}>
                <span style={{ color: '#fbbf24' }}>{item.eco}</span>
                <span style={{ color: 'var(--text-muted)' }}>{item.moves.length} continuations</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{item.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Interactive Preview & Practice */}
      <div className="card" style={{ flex: 1, padding: 20, display: 'flex', gap: 22, alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
        <Board fen={fullFen} sizePx={420} interactive={false} />

        <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>{lookup.eco}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{lookup.name}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {lookup.mainPlan}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>
              MASTER BOOK CONTINUATIONS
            </div>
            {(active?.moves ?? []).map((bm) => (
              <div
                key={bm.uci}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'var(--bg-app)',
                  fontSize: 12.5,
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{bm.san}</span>
                <span style={{ color: 'var(--text-muted)' }}>{bm.games.toLocaleString()}</span>
                <span style={{ color: '#86efac', fontWeight: 700 }}>
                  {bm.whitePct}% / {bm.drawPct}% / {bm.blackPct}%
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void startNewGame({ customFen: fullFen, color: 'w' });
              setActiveTab('play');
            }}
          >
            <Play size={15} /> Practice This Position vs Stockfish
          </button>
        </div>
      </div>
    </div>
  );
};
