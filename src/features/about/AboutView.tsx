import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PIECE_SETS } from '../../components/pieces/pieceSets';

export const AboutView: React.FC = () => {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontWeight: 700, fontSize: 12 }}>
          <ShieldCheck size={16} /> 100% OFFLINE WINDOWS DESKTOP APPLICATION
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>OfflineChess Pro v1.0.0</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Built for Windows x64 with Electron, React, TypeScript, SQLite (WAL), Stockfish 17 UCI, and local GGUF inference via node-llama-cpp. Zero accounts, zero telemetry, zero external network requests.
        </p>
      </div>

      <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>Open-Source Licenses & Credits</h2>
        <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)' }}>
          <li>
            <strong>Application License:</strong> GNU General Public License v3.0 (GPL-3.0)
          </li>
          <li>
            <strong>Stockfish 17 Chess Engine:</strong> GPL-3.0 — Official source at{' '}
            <code>https://github.com/official-stockfish/Stockfish</code>
          </li>
          <li>
            <strong>Qwen2.5-1.5B-Instruct (GGUF):</strong> Apache License 2.0
          </li>
          <li>
            <strong>Lichess Opening Database (ECO):</strong> Creative Commons Zero (CC0 1.0)
          </li>
        </ul>

        <h3 style={{ fontSize: 14, fontWeight: 800, marginTop: 8 }}>Piece Artwork Sets (14 Styles)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          {PIECE_SETS.map((set) => (
            <div
              key={set.id}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
              }}
            >
              <strong>{set.name}</strong>
              <div style={{ color: 'var(--text-muted)' }}>
                {set.styleTag} • {set.license}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
