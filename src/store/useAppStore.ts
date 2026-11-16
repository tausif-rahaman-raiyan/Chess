import { create } from 'zustand';
import { AppSettings, DEFAULT_APP_SETTINGS, OfflineStatusReport } from '../shared/types';

export type NavTab = 'home' | 'play' | 'analysis' | 'saved' | 'openings' | 'settings' | 'about';

interface AppState {
  activeTab: NavTab;
  settings: AppSettings;
  isMaximized: boolean;
  isFullScreen: boolean;
  isFocusMode: boolean;
  offlineStatus: OfflineStatusReport | null;
  toastMessage: string | null;

  setActiveTab: (tab: NavTab) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  setWindowFlags: (flags: { isMaximized: boolean; isFullScreen: boolean }) => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => Promise<void>;
  refreshOfflineStatus: () => Promise<void>;
  showToast: (msg: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'play',
  settings: DEFAULT_APP_SETTINGS,
  isMaximized: false,
  isFullScreen: false,
  isFocusMode: false,
  offlineStatus: null,
  toastMessage: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  loadSettings: async () => {
    if (!window.offlineChess) return;
    const loaded = await window.offlineChess.getSettings();
    set({ settings: loaded });
    applyThemeAttributes(loaded);
  },

  updateSettings: async (patch) => {
    const optimistic = { ...get().settings, ...patch };
    set({ settings: optimistic });
    applyThemeAttributes(optimistic);
    if (window.offlineChess) {
      const saved = await window.offlineChess.updateSettings(patch);
      set({ settings: saved });
      applyThemeAttributes(saved);
    }
  },

  resetSettings: async () => {
    if (!window.offlineChess) return;
    const reset = await window.offlineChess.resetSettings();
    set({ settings: reset });
    applyThemeAttributes(reset);
    get().showToast('Settings restored to defaults');
  },

  setWindowFlags: (flags) => {
    set({
      isMaximized: flags.isMaximized,
      isFullScreen: flags.isFullScreen,
      isFocusMode: flags.isFullScreen ? get().isFocusMode : false,
    });
  },

  setFocusMode: (enabled) => set({ isFocusMode: enabled }),

  toggleFocusMode: async () => {
    const next = !get().isFocusMode;
    set({ isFocusMode: next });
    if (window.offlineChess) {
      const winState = await window.offlineChess.getWindowState();
      if (next && !winState.isFullScreen) {
        const updated = await window.offlineChess.toggleFullscreen();
        set({ isFullScreen: updated.isFullScreen, isMaximized: updated.isMaximized });
      } else if (!next && winState.isFullScreen) {
        const updated = await window.offlineChess.exitFullscreen();
        set({ isFullScreen: updated.isFullScreen, isMaximized: updated.isMaximized });
      }
    }
  },

  refreshOfflineStatus: async () => {
    if (!window.offlineChess) return;
    const report = await window.offlineChess.getOfflineStatus();
    set({ offlineStatus: report });
  },

  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3200);
  },
}));

function applyThemeAttributes(settings: AppSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const effectiveTheme =
    settings.theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : settings.theme;
  root.setAttribute('data-theme', effectiveTheme);
  root.style.setProperty('--accent', settings.accentColor);
  root.style.setProperty('--anim-piece-ms', `${settings.reduceMotion ? 0 : settings.animationDurationMs}ms`);
  if (settings.reduceMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
}
