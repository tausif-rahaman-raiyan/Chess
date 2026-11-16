import { BrowserWindow, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface WindowStateSnapshot {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

export class WindowManager {
  private win: BrowserWindow | null = null;
  private readonly statePath: string;
  private state: WindowStateSnapshot;

  constructor(storageDir: string) {
    fs.mkdirSync(storageDir, { recursive: true });
    this.statePath = path.join(storageDir, 'window-state.json');
    this.state = this.loadState();
  }

  private loadState(): WindowStateSnapshot {
    const primary = screen.getPrimaryDisplay().workAreaSize;
    const fallback: WindowStateSnapshot = {
      width: Math.min(1440, Math.max(1080, Math.round(primary.width * 0.86))),
      height: Math.min(920, Math.max(720, Math.round(primary.height * 0.86))),
      isMaximized: false,
      isFullScreen: false,
    };
    if (!fs.existsSync(this.statePath)) return fallback;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8')) as Partial<WindowStateSnapshot>;
      return {
        x: typeof parsed.x === 'number' ? parsed.x : undefined,
        y: typeof parsed.y === 'number' ? parsed.y : undefined,
        width: typeof parsed.width === 'number' && parsed.width >= 1024 ? parsed.width : fallback.width,
        height: typeof parsed.height === 'number' && parsed.height >= 700 ? parsed.height : fallback.height,
        isMaximized: Boolean(parsed.isMaximized),
        isFullScreen: Boolean(parsed.isFullScreen),
      };
    } catch {
      return fallback;
    }
  }

  private saveState(): void {
    if (!this.win || this.win.isDestroyed()) return;
    const isMaximized = this.win.isMaximized();
    const isFullScreen = this.win.isFullScreen();
    if (!isMaximized && !isFullScreen) {
      const bounds = this.win.getBounds();
      this.state.x = bounds.x;
      this.state.y = bounds.y;
      this.state.width = bounds.width;
      this.state.height = bounds.height;
    }
    this.state.isMaximized = isMaximized;
    this.state.isFullScreen = isFullScreen;
    try {
      fs.writeFileSync(this.statePath, `${JSON.stringify(this.state, null, 2)}
`, 'utf8');
    } catch {
      // Ignore write error on exit
    }
  }

  public createMainWindow(preloadPath: string, iconPath: string): BrowserWindow {
    this.win = new BrowserWindow({
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height,
      minWidth: 1024,
      minHeight: 700,
      frame: false,
      backgroundColor: '#0f131a',
      icon: iconPath,
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    if (this.state.isMaximized) {
      this.win.maximize();
    }
    if (this.state.isFullScreen) {
      this.win.setFullScreen(true);
    }

    this.win.once('ready-to-show', () => {
      this.win?.show();
    });

    const emitWindowState = () => {
      this.saveState();
      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send('window:stateEvent', this.getWindowState());
      }
    };

    this.win.on('maximize', emitWindowState);
    this.win.on('unmaximize', emitWindowState);
    this.win.on('enter-full-screen', emitWindowState);
    this.win.on('leave-full-screen', emitWindowState);
    this.win.on('resize', () => this.saveState());
    this.win.on('move', () => this.saveState());
    this.win.on('close', () => this.saveState());

    return this.win;
  }

  public getWindow(): BrowserWindow | null {
    return this.win;
  }

  public getWindowState(): { isMaximized: boolean; isFullScreen: boolean } {
    return {
      isMaximized: this.win?.isMaximized() ?? false,
      isFullScreen: this.win?.isFullScreen() ?? false,
    };
  }
}
