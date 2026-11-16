import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Play,
  Search,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { MoveClassification, SavedGameRecord } from '../../shared/types';
import { BADGE_META, BadgeChip } from '../../components/BadgeIcon';
import { parseSinglePgn, splitMultiGamePgn } from '../../core/pgn';
import { useAppStore } from '../../store/useAppStore';
import { useGameStore } from '../../store/useGameStore';

export const SavedGamesView: React.FC = () => {
  const { setActiveTab, showToast } = useAppStore();
  const { resumeSavedGame } = useGameStore();

  const [games, setGames] = useState<SavedGameRecord[]>([]);
  const [selectedReviewGame, setSelectedReviewGame] = useState<SavedGameRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'wins' | 'losses' | 'draws' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'accuracy' | 'rating'>('date');
  const [notesDraft, setNotesDraft] = useState('');

  const reloadGames = async () => {
    if (!window.offlineChess) return;
    const list = await window.offlineChess.listGames(false);
    setGames(list);
  };

  useEffect(() => {
    void reloadGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        if (resultFilter === 'favorites' && !g.favorite) return false;
        const won =
          (g.myColor === 'w' && g.result === '1-0') || (g.myColor === 'b' && g.result === '0-1');
        const lost =
          (g.myColor === 'w' && g.result === '0-1') || (g.myColor === 'b' && g.result === '1-0');
        if (resultFilter === 'wins' && !won) return false;
        if (resultFilter === 'losses' && !lost) return false;
        if (resultFilter === 'draws' && g.result !== '1/2-1/2') return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            g.white.toLowerCase().includes(q) ||
            g.black.toLowerCase().includes(q) ||
            g.openingName.toLowerCase().includes(q) ||
            g.openingEco.toLowerCase().includes(q) ||
            g.notes.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'accuracy') return (b.accuracyMe ?? -1) - (a.accuracyMe ?? -1);
        if (sortBy === 'rating') return b.opponentRating - a.opponentRating;
        return b.id - a.id;
      });
  }, [games, resultFilter, searchQuery, sortBy]);

  const handleOpenReview = async (id: number) => {
    if (!window.offlineChess) return;
    const full = await window.offlineChess.getGame(id);
    if (full) {
      setSelectedReviewGame(full);
      setNotesDraft(full.notes);
    }
  };

  const handleImportPgn = async () => {
    if (!window.offlineChess) return;
    const res = await window.offlineChess.importPgnFile();
    if (res.canceled || !res.content) return;
    const chunks = splitMultiGamePgn(res.content);
    let importedCount = 0;
    for (const chunk of chunks) {
      try {
        const parsed = parseSinglePgn(chunk);
        await window.offlineChess.saveGame({
          pgn: parsed.pgn,
          white: parsed.white,
          black: parsed.black,
          result: parsed.result,
          date: parsed.date,
          timeControl: parsed.timeControl,
          myColor: parsed.myColor,
          opponentRating: 1500,
          openingEco: parsed.openingEco,
          openingName: parsed.openingName,
          accuracyMe: null,
          notes: '',
          favorite: false,
          isAutosave: false,
          moves: parsed.moves,
        });
        importedCount++;
      } catch {
        // Skip invalid PGN chunk
      }
    }
    showToast(`Imported ${importedCount} game(s) from PGN`);
    await reloadGames();
  };

  const handleBulkExportPgn = async () => {
    if (!window.offlineChess) return;
    const target =
      selectedIds.length > 0 ? games.filter((g) => selectedIds.includes(g.id)) : filteredGames;
    if (target.length === 0) return;
    const combined = target.map((g) => g.pgn).join('

');
    await window.offlineChess.exportPgnFile(combined, 'OfflineChess-Export.pgn');
  };

  const handleBulkDelete = async () => {
    if (!window.offlineChess || selectedIds.length === 0) return;
    await window.offlineChess.deleteGames(selectedIds);
    if (selectedReviewGame && selectedIds.includes(selectedReviewGame.id)) {
      setSelectedReviewGame(null);
    }
    setSelectedIds([]);
    await reloadGames();
    showToast('Selected games deleted');
  };

  const reviewBadgeCounts = useMemo(() => {
    const map: Partial<Record<MoveClassification, number>> = {};
    for (const m of selectedReviewGame?.moves ?? []) {
      if (m.classification) {
        map[m.classification] = (map[m.classification] ?? 0) + 1;
      }
    }
    return map;
  }, [selectedReviewGame]);

  return (
    <div style={{ height: '100%', display: 'flex', gap: 18, padding: 20, overflow: 'hidden' }}>
      {/* Left: Filterable Library */}
      <div className="card" style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Saved Games & Full Review ({filteredGames.length})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={() => void handleImportPgn()}>
              <Upload size={14} /> Import PGN
            </button>
            <button type="button" className="btn" onClick={() => void handleBulkExportPgn()}>
              <Download size={14} /> Export PGN
            </button>
            {selectedIds.length > 0 && (
              <button type="button" className="btn btn-danger" onClick={() => void handleBulkDelete()}>
                <Trash2 size={14} /> Delete ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search opponent, ECO, opening, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: 30 }}
            />
          </div>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
            className="input-field"
          >
            <option value="all">All Results</option>
            <option value="wins">My Wins</option>
            <option value="losses">My Losses</option>
            <option value="draws">Draws</option>
            <option value="favorites">Favorites ★</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="input-field"
          >
            <option value="date">Sort: Newest</option>
            <option value="accuracy">Sort: Highest Accuracy</option>
            <option value="rating">Sort: Opponent Rating</option>
          </select>
        </div>

        {/* Games List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredGames.map((g) => {
            const isSelected = selectedReviewGame?.id === g.id;
            const checked = selectedIds.includes(g.id);
            return (
              <div
                key={g.id}
                onClick={() => void handleOpenReview(g.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: isSelected ? 'var(--accent-soft)' : 'var(--bg-surface-elevated)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setSelectedIds((prev) =>
                        e.target.checked ? [...prev, g.id] : prev.filter((x) => x !== g.id),
                      );
                    }}
                  />
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await window.offlineChess?.toggleFavorite(g.id);
                      await reloadGames();
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: g.favorite ? '#facc15' : 'var(--text-muted)' }}
                  >
                    <Star size={16} fill={g.favorite ? '#facc15' : 'none'} />
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {g.white} vs {g.black}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {g.openingEco} {g.openingName} • {g.timeControl} • {g.date}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{g.result}</span>
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
                      {g.accuracyMe}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredGames.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No saved games match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Right: Interactive Full Game Review Panel */}
      {selectedReviewGame && (
        <div
          className="card"
          style={{
            width: 420,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Full Game Review</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {selectedReviewGame.openingEco} {selectedReviewGame.openingName}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                resumeSavedGame(selectedReviewGame);
                setActiveTab('play');
              }}
            >
              <Play size={14} /> Open on Board
            </button>
          </div>

          {/* Accuracy Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              background: 'var(--bg-surface-elevated)',
              padding: 12,
              borderRadius: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>YOUR ACCURACY</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#81b64c' }}>
                {selectedReviewGame.accuracyMe ?? '—'}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>OPPONENT RATING</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {selectedReviewGame.opponentRating}
              </div>
            </div>
          </div>

          {/* Win Probability SVG Sparkline Graph */}
          <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 10, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              WIN PROBABILITY GRAPH
            </div>
            <svg viewBox="0 0 360 80" width="100%" height="80">
              <line x1="0" y1="40" x2="360" y2="40" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />
              {(selectedReviewGame.moves?.length ?? 0) > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  points={(selectedReviewGame.moves ?? [])
                    .map((m, i, arr) => {
                      const x = (i / Math.max(1, arr.length - 1)) * 360;
                      const y = 80 - (Math.max(0, Math.min(100, m.winProb)) / 100) * 80;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />
              )}
            </svg>
          </div>

          {/* Classification Breakdown */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.entries(reviewBadgeCounts) as Array<[MoveClassification, number]>).map(([cls, count]) => (
              <div
                key={cls}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 9px',
                  borderRadius: 8,
                  background: 'var(--bg-surface-elevated)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <BadgeChip classification={cls} size={18} />
                <span>{BADGE_META[cls].label}: {count}</span>
              </div>
            ))}
          </div>

          {/* Personal Study Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)' }}>
              PERSONAL NOTES
            </label>
            <textarea
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Write key takeaways from this match..."
              className="input-field"
              style={{ resize: 'vertical' }}
            />
            <button
              type="button"
              className="btn"
              onClick={async () => {
                await window.offlineChess?.updateNotes(selectedReviewGame.id, notesDraft);
                showToast('Game notes saved');
                await reloadGames();
              }}
            >
              Save Notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
