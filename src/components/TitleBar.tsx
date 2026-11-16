import React from 'react';
import { Maximize2, Minimize2, Minus, ShieldCheck, Square, X, Eye } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const TitleBar: React.FC = () => {
  const { isMaximized, isFullScreen, isFocusMode, toggleFocusMode } = useAppStore();

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    void window.offlineChess?.toggleMaximizeWindow();
  };

  return (
    <header
      onDoubleClick={handleDoubleClick}
      style={{
        height: 38,
        minHeight: 38,
        background: 'var(--bg-rail)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px 0 14px',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left: App Icon + Title + Offline Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="20" height="20" viewBox="0 0 512 512" aria-hidden="true">
          <rect x="16" y="16" width="480" height="480" rx="104" fill="#091526" stroke="#38bdf8" strokeWidth="18" />
          <path
            d="M244 58 H268 V84 H292 V108 H268 V136 H244 V108 H220 V84 H244 Z M196 144 H316 L302 204 H210 Z M214 220 H298 L326 350 H186 Z M156 364 H356 L366 406 H146 Z"
            fill="#38bdf8"
          />
        </svg>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>
          OfflineChess <span style={{ color: 'var(--accent)' }}>Pro</span>
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: '#4ade80',
            background: 'rgba(74, 222, 128, 0.12)',
            border: '1px solid rgba(74, 222, 128, 0.28)',
            padding: '2px 8px',
            borderRadius: 999,
          }}
        >
          <ShieldCheck size={12} /> 100% Offline
        </span>
      </div>

      {/* Right: Focus Mode + Fullscreen + Native Window Controls (no-drag) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => void toggleFocusMode()}
          title="Focus Mode (Board + Analysis Only)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: isFocusMode ? 'var(--accent-soft)' : 'transparent',
            border: '1px solid transparent',
            borderRadius: 6,
            padding: '4px 9px',
            fontSize: 12,
            fontWeight: 600,
            color: isFocusMode ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Eye size={13} /> Focus
        </button>

        <button
          type="button"
          onClick={() => void window.offlineChess?.toggleFullscreen()}
          title="Toggle Fullscreen (F11)"
          style={winBtnStyle}
        >
          {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        <button
          type="button"
          onClick={() => void window.offlineChess?.minimizeWindow()}
          title="Minimize"
          style={winBtnStyle}
        >
          <Minus size={14} />
        </button>

        <button
          type="button"
          onClick={() => void window.offlineChess?.toggleMaximizeWindow()}
          title={isMaximized ? 'Restore' : 'Maximize'}
          style={winBtnStyle}
        >
          <Square size={12} />
        </button>

        <button
          type="button"
          onClick={() => void window.offlineChess?.closeWindow()}
          title="Close"
          style={{ ...winBtnStyle, color: '#fca5a5' }}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
};

const winBtnStyle: React.CSSProperties = {
  width: 32,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};
