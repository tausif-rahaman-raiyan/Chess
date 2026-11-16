import { MoveClassification, SoundPackId } from '../shared/types';

class OfflineSoundEngine {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType,
    gainVal: number,
    delaySec = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durationSec);

    gain.gain.setValueAtTime(Math.max(0.0001, gainVal), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }

  public playMoveSound(
    kind: 'move' | 'capture' | 'check' | 'castle' | 'gameover',
    pack: SoundPackId,
    volume: number,
    enabled: boolean,
  ): void {
    if (!enabled || volume <= 0) return;
    const v = Math.min(1, Math.max(0, volume)) * 0.28;

    if (kind === 'gameover') {
      this.playTone(440, 330, 0.22, 'triangle', v, 0);
      this.playTone(330, 261.6, 0.35, 'triangle', v, 0.16);
      return;
    }

    if (kind === 'check') {
      this.playTone(680, 920, 0.14, 'sine', v * 1.1, 0);
      return;
    }

    if (kind === 'castle') {
      this.playMoveSound('move', pack, volume, enabled);
      setTimeout(() => this.playMoveSound('move', pack, volume * 0.85, enabled), 95);
      return;
    }

    if (pack === 'wood') {
      if (kind === 'capture') {
        this.playTone(230, 72, 0.11, 'triangle', v * 1.35);
      } else {
        this.playTone(175, 64, 0.085, 'sine', v);
      }
    } else if (pack === 'soft') {
      if (kind === 'capture') {
        this.playTone(340, 140, 0.12, 'sine', v * 1.1);
      } else {
        this.playTone(280, 160, 0.09, 'sine', v * 0.85);
      }
    } else {
      // classic
      if (kind === 'capture') {
        this.playTone(420, 110, 0.1, 'square', v * 0.7);
      } else {
        this.playTone(310, 120, 0.075, 'triangle', v * 0.9);
      }
    }
  }

  public playClassificationSound(
    classification: MoveClassification,
    volume: number,
    enabled: boolean,
  ): void {
    if (!enabled || volume <= 0) return;
    const v = Math.min(1, Math.max(0, volume)) * 0.22;

    if (classification === 'brilliant') {
      this.playTone(587.33, 880, 0.14, 'sine', v, 0);
      this.playTone(880, 1174.66, 0.24, 'triangle', v * 1.1, 0.1);
    } else if (classification === 'great' || classification === 'best') {
      this.playTone(523.25, 659.25, 0.14, 'sine', v * 0.85, 0);
    } else if (classification === 'blunder' || classification === 'miss') {
      this.playTone(220, 130, 0.22, 'sawtooth', v * 0.75, 0);
    } else if (classification === 'mistake') {
      this.playTone(260, 185, 0.16, 'triangle', v * 0.7, 0);
    }
  }
}

export const soundEngine = new OfflineSoundEngine();
