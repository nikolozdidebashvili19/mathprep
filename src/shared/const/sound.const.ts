export type SoundName = 'correct' | 'wrong' | 'complete';

export type SoundNote = {
  /** Seconds after the cue starts. */
  at: number;
  freq: number;
  duration: number;
  volume: number;
  wave: OscillatorType;
};

export const SOUND_STORAGE_KEY = 'erovnuli.sound';

/** Our own short cues: a bright rising pair, a soft low falling pair, and a little arpeggio for a finished day. */
export const SOUND_CUES: Record<SoundName, SoundNote[]> = {
  correct: [
    { at: 0, freq: 659.25, duration: 0.12, volume: 0.18, wave: 'triangle' },
    { at: 0.09, freq: 987.77, duration: 0.22, volume: 0.18, wave: 'triangle' },
  ],
  wrong: [
    { at: 0, freq: 311.13, duration: 0.16, volume: 0.14, wave: 'sine' },
    { at: 0.13, freq: 233.08, duration: 0.28, volume: 0.14, wave: 'sine' },
  ],
  complete: [
    { at: 0, freq: 523.25, duration: 0.14, volume: 0.16, wave: 'triangle' },
    { at: 0.1, freq: 659.25, duration: 0.14, volume: 0.16, wave: 'triangle' },
    { at: 0.2, freq: 783.99, duration: 0.14, volume: 0.16, wave: 'triangle' },
    { at: 0.3, freq: 1046.5, duration: 0.4, volume: 0.18, wave: 'triangle' },
  ],
};

export const SOUND_COPY = {
  mute: 'ხმის გამორთვა',
  unmute: 'ხმის ჩართვა',
};
