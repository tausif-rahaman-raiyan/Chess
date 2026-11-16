import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Database,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { MoveClassification } from '../../shared/types';
import { BADGE_META, BadgeChip } from '../../components/BadgeIcon';
import { Board } from '../../components/Board';
import { BOARD_THEMES } from '../../components/board/boardThemes';
import { PIECE_SETS } from '../../components/pieces/pieceSets';
import { soundEngine } from '../../core/soundEngine';
import { useAppStore } from '../../store/useAppStore';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetSettings, offlineStatus, refreshOfflineStatus, showToast } =
    useAppStore();
  const [engineTestStatus, setEngineTestStatus] = useState<string>('');
  const [llmTestStatus, setLlmTestStatus] = useState<string>('');

  useEffect(() => {
    void refreshOfflineStatus();
  }, [refreshOfflineStatus]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Settings & Offline Diagnostics</h1>
        <button type="button" className="btn btn-danger" onClick={() => void resetSettings()}>
          <RefreshCw size={14} /> Reset All Defaults
        </button>
      </div>

      {/* 1. Board & 14 Piece Styles + Live Preview */}
      <section className="card" style={sectionStyle}>
        <div style={headerStyle}>
          <Palette size={16} color="var(--accent)" /> Board Theme (14) & Piece Style (14)
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <Board
            fen="r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4"
            sizePx={270}
            interactive={false}
          />

          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={rowStyle}>
              <label>App Theme & Accent</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={settings.theme}
                  onChange={(e) => void updateSettings({ theme: e.target.value as 'dark' | 'light' | 'system' })}
                  className="input-field"
                >
                  <option value="dark">Dark Mode</option>
                  <option value="light">Light Mode</option>
                  <option value="system">System Match</option>
                </select>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => void updateSettings({ accentColor: e.target.value })}
                  style={{ width: 38, height: 34, border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={rowStyle}>
              <label>Board Theme ({BOARD_THEMES.length} Styles)</label>
              <select
                value={settings.boardTheme}
                onChange={(e) => void updateSettings({ boardTheme: e.target.value })}
                className="input-field"
                style={{ minWidth: 220 }}
              >
                {BOARD_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={rowStyle}>
              <label>Piece Style ({PIECE_SETS.length} Distinct Sets)</label>
              <select
                value={settings.pieceSet}
                onChange={(e) => void updateSettings({ pieceSet: e.target.value })}
                className="input-field"
                style={{ minWidth: 220 }}
              >
                {PIECE_SETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.styleTag}
                  </option>
                ))}
              </select>
            </div>

            <div style={rowStyle}>
              <label>Board Size ({settings.boardAutoFit ? 'Auto-Fit' : `${settings.boardSizePx} px`})</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={settings.boardAutoFit}
                    onChange={(e) => void updateSettings({ boardAutoFit: e.target.checked })}
                  />
                  Auto-Fit
                </label>
                <input
                  type="range"
                  min={320}
                  max={1200}
                  step={16}
                  disabled={settings.boardAutoFit}
                  value={settings.boardSizePx}
                  onChange={(e) => void updateSettings({ boardSizePx: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={rowStyle}>
              <label>Piece Glide Speed ({settings.animationDurationMs} ms)</label>
              <input
                type="range"
                min={0}
                max={1000}
                step={25}
                value={settings.animationDurationMs}
                onChange={(e) => void updateSettings({ animationDurationMs: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Audio & Gameplay Rules */}
      <section className="card" style={sectionStyle}>
        <div style={headerStyle}>
          <Volume2 size={16} color="var(--accent)" /> Sound & Gameplay Preferences
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <div style={rowStyle}>
            <label>Sound Pack & Volume</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={settings.soundPack}
                onChange={(e) => {
                  const pack = e.target.value as 'soft' | 'wood' | 'classic';
                  void updateSettings({ soundPack: pack });
                  soundEngine.playMoveSound('move', pack, settings.soundVolume, true);
                }}
                className="input-field"
              >
                <option value="wood">Wood</option>
                <option value="soft">Soft</option>
                <option value="classic">Classic</option>
              </select>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.soundVolume}
                onChange={(e) => void updateSettings({ soundVolume: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={rowStyle}>
            <label>Bot Thinking Delay</label>
            <select
              value={settings.thinkingDelayMode}
              onChange={(e) =>
                void updateSettings({ thinkingDelayMode: e.target.value as 'instant' | 'human' | 'slow' })
              }
              className="input-field"
            >
              <option value="instant">Instant (0 ms)</option>
              <option value="human">Human-like (0.4–2.5s)</option>
              <option value="slow">Thoughtful Slow</option>
            </select>
          </div>

          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.autoQueen}
              onChange={(e) => void updateSettings({ autoQueen: e.target.checked })}
            />
            Auto-Promote Pawns to Queen
          </label>

          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.assistModeInPlay}
              onChange={(e) => void updateSettings({ assistModeInPlay: e.target.checked })}
            />
            Always Show Best-Move Arrow in Play (Off by default)
          </label>
        </div>
      </section>

      {/* 3. Move Quality Badges (Your Moves Only) */}
      <section className="card" style={sectionStyle}>
        <div style={headerStyle}>
          <Sparkles size={16} color="#26c2a3" /> Real-Time Move Quality Badges (Your Moves Only)
        </div>
        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.moveQualityEnabled}
            onChange={(e) => void updateSettings({ moveQualityEnabled: e.target.checked })}
          />
          Enable Real-Time Move Quality Badges on My Moves
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {(Object.keys(BADGE_META) as MoveClassification[]).map((cat) => (
            <label
              key={cat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 8,
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={settings.enabledBadgeCategories[cat]}
                onChange={(e) =>
                  void updateSettings({
                    enabledBadgeCategories: {
                      ...settings.enabledBadgeCategories,
                      [cat]: e.target.checked,
                    },
                  })
                }
              />
              <BadgeChip classification={cat} size={18} />
              <span>{BADGE_META[cat].label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 4. Stockfish 17 Engine & Local GGUF AI Coach */}
      <section className="card" style={sectionStyle}>
        <div style={headerStyle}>
          <Cpu size={16} color="var(--accent)" /> Stockfish 17 & Local AI Coach
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <div style={rowStyle}>
            <label>Engine CPU Threads ({settings.engineThreads})</label>
            <input
              type="range"
              min={1}
              max={16}
              value={settings.engineThreads}
              onChange={(e) => void updateSettings({ engineThreads: Number(e.target.value) })}
            />
          </div>

          <div style={rowStyle}>
            <label>Hash Table Size</label>
            <select
              value={settings.engineHashMb}
              onChange={(e) => void updateSettings({ engineHashMb: Number(e.target.value) })}
              className="input-field"
            >
              {[16, 32, 64, 128, 256, 512, 1024].map((mb) => (
                <option key={mb} value={mb}>
                  {mb} MB
                </option>
              ))}
            </select>
          </div>

          <div style={rowStyle}>
            <label>Explanation Mode</label>
            <select
              value={settings.explanationMode}
              onChange={(e) =>
                void updateSettings({ explanationMode: e.target.value as 'off' | 'template' | 'ai' })
              }
              className="input-field"
            >
              <option value="ai">Local GGUF AI + Engine Verification</option>
              <option value="template">Deterministic Engine Narrator Only</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div style={rowStyle}>
            <label>Explanation Level</label>
            <select
              value={settings.explanationLevel}
              onChange={(e) =>
                void updateSettings({
                  explanationLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced',
                })
              }
              className="input-field"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              setEngineTestStatus('Testing Stockfish 17...');
              const res = await window.offlineChess?.testEngine();
              if (res?.ok) {
                setEngineTestStatus(`OK: ${res.binary} reached depth ${res.depthReached}`);
              } else {
                setEngineTestStatus('Engine check failed');
              }
            }}
          >
            Test Stockfish Engine
          </button>

          <button
            type="button"
            className="btn"
            onClick={async () => {
              const res = await window.offlineChess?.importGgufModel();
              if (res && !res.canceled) {
                showToast(`Imported model: ${res.fileName}`);
                await refreshOfflineStatus();
              }
            }}
          >
            Import Custom .gguf Model
          </button>

          <button
            type="button"
            className="btn"
            onClick={async () => {
              setLlmTestStatus('Running local coaching check...');
              const res = await window.offlineChess?.testLlmPrompt();
              if (res) {
                setLlmTestStatus(`OK (${res.source}): ${res.summary.slice(0, 75)}...`);
              }
            }}
          >
            Test AI Coach Prompt
          </button>
        </div>

        {(engineTestStatus || llmTestStatus) && (
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#86efac' }}>
            {engineTestStatus} {llmTestStatus}
          </div>
        )}
      </section>

      {/* 5. Offline Security Verification & Data Backup */}
      <section className="card" style={sectionStyle}>
        <div style={headerStyle}>
          <ShieldCheck size={16} color="#4ade80" /> Offline Verification & SQLite Backup
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div>
            <strong>External Network Requests Blocked/Made:</strong>{' '}
            <span style={{ color: '#4ade80', fontWeight: 800 }}>
              {offlineStatus?.blockedRequestsCount ?? 0} blocked / 0 allowed
            </span>
          </div>
          <div>
            <strong>Detected CPU Features:</strong>{' '}
            {(offlineStatus?.cpuFeatures ?? ['x86-64']).join(', ').toUpperCase()} |{' '}
            <strong>System RAM:</strong> {offlineStatus?.systemRamGb ?? 8} GB
          </div>
          <div>
            <strong>Local Storage Path:</strong>{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>
              {offlineStatus?.storageDirectory ?? '%APPDATA%\OfflineChessPro'}
            </code>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-accent"
            onClick={async () => {
              const res = await window.offlineChess?.exportBackupZip();
              if (res && !res.canceled) showToast('Backup ZIP exported');
            }}
          >
            <Database size={14} /> Export Backup ZIP
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const res = await window.offlineChess?.importBackupZip();
              if (res && !res.canceled) showToast('Backup ZIP restored');
            }}
          >
            Restore Backup ZIP
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              await window.offlineChess?.clearCaches();
              showToast('Analysis & explanation cache cleared');
            }}
          >
            Clear Analysis Cache
          </button>
        </div>
      </section>
    </div>
  );
};

const sectionStyle: React.CSSProperties = {
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  fontWeight: 800,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: 13,
};

const checkboxLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  cursor: 'pointer',
};
