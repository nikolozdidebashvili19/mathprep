import { SOUND_CUES, SOUND_STORAGE_KEY, type SoundName } from '@/shared/const/sound.const';

type Listener = () => void;

/**
 * Short feedback sounds (correct / wrong / lesson complete), synthesised with the Web Audio API, so there are no
 * audio files to load. On by default; the student can mute it, and the choice is remembered in localStorage.
 * Safe to import on the server: nothing touches `window` until a sound is played or the setting is read.
 */
class SoundPlayer {
  private context: AudioContext | null = null;
  private listeners = new Set<Listener>();
  private cachedEnabled: boolean | null = null;

  isEnabled(): boolean {
    if (this.cachedEnabled !== null) return this.cachedEnabled;
    try {
      this.cachedEnabled = typeof window === 'undefined' ? true : window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
    } catch {
      this.cachedEnabled = true;
    }
    return this.cachedEnabled;
  }

  setEnabled(enabled: boolean): void {
    this.cachedEnabled = enabled;
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Private mode or blocked storage: the setting still applies for this visit.
    }
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  play(name: SoundName): void {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + 0.01;
    for (const note of SOUND_CUES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = start + note.at;
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.freq, at);
      // Quick attack and an exponential fade, so notes do not click.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(note.volume, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + note.duration + 0.02);
    }
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
    try {
      this.context = new window.AudioContext();
    } catch {
      return null;
    }
    return this.context;
  }
}

export const sound = new SoundPlayer();
export { SoundPlayer };
