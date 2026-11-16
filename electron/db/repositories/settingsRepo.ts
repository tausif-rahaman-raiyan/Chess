import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../../../src/shared/types';

export class SettingsRepository {
  private readonly settingsPath: string;
  private current: AppSettings;

  constructor(storageDir: string) {
    fs.mkdirSync(storageDir, { recursive: true });
    this.settingsPath = path.join(storageDir, 'settings.json');
    this.current = this.loadAndMigrate();
  }

  private getHardwareDefaults(): Partial<AppSettings> {
    const cpuCount = Math.max(1, os.cpus().length);
    const totalRamGb = os.totalmem() / (1024 ** 3);
    return {
      engineThreads: Math.min(8, Math.max(1, Math.floor(cpuCount / 2))),
      llmThreads: Math.min(8, Math.max(2, Math.floor(cpuCount / 2))),
      llmModelTier: totalRamGb < 6 ? 'lite' : 'lite',
    };
  }

  private loadAndMigrate(): AppSettings {
    const defaults: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...this.getHardwareDefaults(),
    };

    if (!fs.existsSync(this.settingsPath)) {
      this.persist(defaults);
      return defaults;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8')) as Partial<AppSettings>;
      const merged: AppSettings = {
        ...defaults,
        ...raw,
        enabledBadgeCategories: {
          ...defaults.enabledBadgeCategories,
          ...(raw.enabledBadgeCategories ?? {}),
        },
        classificationThresholds: {
          ...defaults.classificationThresholds,
          ...(raw.classificationThresholds ?? {}),
        },
        schemaVersion: DEFAULT_APP_SETTINGS.schemaVersion,
      };
      if ((raw.schemaVersion ?? 0) < DEFAULT_APP_SETTINGS.schemaVersion) {
        this.persist(merged);
      }
      return merged;
    } catch {
      this.persist(defaults);
      return defaults;
    }
  }

  private persist(settings: AppSettings): void {
    fs.writeFileSync(this.settingsPath, `${JSON.stringify(settings, null, 2)}
`, 'utf8');
  }

  public getSettings(): AppSettings {
    return { ...this.current };
  }

  public updateSettings(patch: Record<string, unknown>): AppSettings {
    const next: AppSettings = {
      ...this.current,
      ...(patch as Partial<AppSettings>),
      enabledBadgeCategories: {
        ...this.current.enabledBadgeCategories,
        ...((patch.enabledBadgeCategories as Partial<AppSettings['enabledBadgeCategories']>) ?? {}),
      },
      classificationThresholds: {
        ...this.current.classificationThresholds,
        ...((patch.classificationThresholds as Partial<AppSettings['classificationThresholds']>) ??
          {}),
      },
      schemaVersion: DEFAULT_APP_SETTINGS.schemaVersion,
    };
    this.current = next;
    this.persist(next);
    return this.getSettings();
  }

  public resetToDefaults(): AppSettings {
    const fresh: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...this.getHardwareDefaults(),
    };
    this.current = fresh;
    this.persist(fresh);
    return this.getSettings();
  }
}
