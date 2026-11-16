import React, { useEffect } from 'react';
import { EyeOff } from 'lucide-react';
import { NavRail } from '../components/NavRail';
import { TitleBar } from '../components/TitleBar';
import { AboutView } from '../features/about/AboutView';
import { AnalysisView } from '../features/analysis/AnalysisView';
import { HomeView } from '../features/home/HomeView';
import { OpeningsView } from '../features/openings/OpeningsView';
import { PlayView } from '../features/play/PlayView';
import { SavedGamesView } from '../features/saved/SavedGamesView';
import { SettingsView } from '../features/settings/SettingsView';
import { useAppStore } from '../store/useAppStore';
import { useGameStore } from '../store/useGameStore';

export const App: React.FC = () => {
  const {
    activeTab,
    isFocusMode,
    toastMessage,
    loadSettings,
    setWindowFlags,
    toggleFocusMode,
    refreshOfflineStatus,
  } = useAppStore();

  useEffect(() => {
    void loadSettings();
    void refreshOfflineStatus();
    void useGameStore.getState().startNewGame({ color: 'w' });

    const offWin = window.offlineChess?.onWindowStateChange((flags) => {
      setWindowFlags(flags);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        void window.offlineChess?.toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (useAppStore.getState().isFocusMode) {
          void useAppStore.getState().toggleFocusMode();
        } else {
          void window.offlineChess?.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      offWin?.();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadSettings, refreshOfflineStatus, setWindowFlags]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Custom Frameless TitleBar (hidden in Focus Mode) */}
      {!isFocusMode && <TitleBar />}

      {/* Floating Exit Focus Pill when in Focus Mode */}
      {isFocusMode && (
        <button
          type="button"
          onClick={() => void toggleFocusMode()}
          style={{
            position: 'fixed',
            top: 10,
            right: 12,
            zIndex: 80,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 999,
            background: 'rgba(24, 24, 27, 0.86)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <EyeOff size={13} /> Exit Focus (ESC)
        </button>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!isFocusMode && <NavRail />}

        <main style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'play' && <PlayView />}
          {activeTab === 'analysis' && <AnalysisView />}
          {activeTab === 'saved' && <SavedGamesView />}
          {activeTab === 'openings' && <OpeningsView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'about' && <AboutView />}
        </main>
      </div>

      {/* Non-intrusive Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 18,
            right: 18,
            zIndex: 90,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
