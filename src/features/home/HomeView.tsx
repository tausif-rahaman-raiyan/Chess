import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, ShieldCheck, Sparkles, Swords, Trophy } from 'lucide-react';
import { SavedGameRecord } from '../../shared/types';
import { useAppStore } from '../../store/useAppStore';
import { useGameStore } from '../../store/useGameStore';

export const HomeView: React.FC = () => {
  const { settings, setActiveTab, offlineStatus } = useAppStore();
  const { startNewGame, resumeSavedGame } = useGameStore();
  const [recentGames, setRecentGames] = useState<SavedGameRecord[]>([]);
  const [autosaveGame, setAutosaveGame] = useState<SavedGameRecord | null>(null);

  useEffect(() => {
    if (!window.offlineChess) return;
    void window.offlineChess.listGames(false).then((list) => setRecentGames(list.slice(0, 5)));
    void window.offlineChess.getAutosave().then((auto) => setAutosaveGame(auto));
  }, []);

  const ratedGames = recentGames.filter((g) => g.accuracyMe !== null);
  const avgAccuracy =
    ratedGames.length > 0
      ? (ratedGames.reduce((acc, g) => acc + (g.accuracyMe ?? 0), 0) / ratedGames.length).toFixed(1)
      : '—';

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero Banner */}
      <div
        className="card"
        style={{
          padding: 24,
          background: 'linear-gradient(135deg, #1b2838 0%, #161512 65%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 620 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 800 }}>
            <ShieldCheck size={15} /> AIR-GAPPED WINDOWS CHESS WORKSTATION
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Welcome back to OfflineChess Pro
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Train against Stockfish 17 calibrated from 0 to 3500 Elo, review real-time move quality badges on your moves, and click any piece for grounded local AI coaching—with zero network connections.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: 14 }}
              onClick={() => {
                void startNewGame({ rating: settings.defaultRating, color: 'w' });
                setActiveTab('play');
              }}
            >
              <Play size={16} /> Play at My Level ({settings.defaultRating})
            </button>

            {autosaveGame && (
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  resumeSavedGame(autosaveGame);
                  setActiveTab('play');
                }}
              >
                <RotateCcw size={15} /> Resume Autosaved Game ({autosaveGame.moves?.length ?? 0} plies)
              </button>
            )}

            <button type="button" className="btn" onClick={() => setActiveTab('analysis')}>
              <Sparkles size={15} /> Open Analysis Board
            </button>
          </div>
        </div>

        {/* Hardware & Accuracy Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, minWidth: 260 }}>
          <div style={statCardStyle}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>RECENT ACCURACY</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#81b64c' }}>{avgAccuracy}%</span>
          </div>
          <div style={statCardStyle}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>SAVED GAMES</span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{recentGames.length}</span>
          </div>
          <div style={statCardStyle}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ENGINE BINARY</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {offlineStatus?.activeEngineBinary ?? 'Stockfish 17'}
            </span>
          </div>
          <div style={statCardStyle}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LOCAL COACH</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
              {offlineStatus?.llmStatus === 'ready' ? 'Qwen2.5 GGUF' : 'Engine Narrator'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Games Table */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
            <Trophy size={17} color="#f59e0b" /> Recent Matches
          </div>
          <button type="button" className="btn" onClick={() => setActiveTab('saved')}>
            View All Games
          </button>
        </div>

        {recentGames.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No completed games saved yet. Start your first match in Play!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentGames.map((g) => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Swords size={15} color="var(--accent)" />
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {g.white} vs {g.black}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {g.openingEco} {g.openingName} • {g.date}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{g.result}</span>
                  {g.accuracyMe !== null && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(129, 182, 76, 0.16)',
                        color: '#a3e635',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {g.accuracyMe}% Acc
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const statCardStyle: React.CSSProperties = {
  background: 'var(--bg-surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
