import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SOUND_CUES, SOUND_STORAGE_KEY } from '@/shared/const/sound.const';

import { SoundPlayer } from './sound';

const makeParam = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

let oscillators: { start: ReturnType<typeof vi.fn> }[] = [];

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  resume = vi.fn();
  createOscillator() {
    const osc = { type: '', frequency: makeParam(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    oscillators.push(osc);
    return osc;
  }
  createGain() {
    return { gain: makeParam(), connect: vi.fn() };
  }
}

const storage = new Map<string, string>();

beforeEach(() => {
  oscillators = [];
  storage.clear();
  vi.stubGlobal('window', {
    AudioContext: FakeAudioContext,
    localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) },
  });
});

describe('SoundPlayer', () => {
  it('is on by default and plays one oscillator per note', () => {
    const player = new SoundPlayer();
    expect(player.isEnabled()).toBe(true);
    player.play('complete');
    expect(oscillators).toHaveLength(SOUND_CUES.complete.length);
  });

  it('stays silent when muted and remembers the choice', () => {
    const player = new SoundPlayer();
    player.setEnabled(false);
    player.play('correct');
    expect(oscillators).toHaveLength(0);
    expect(storage.get(SOUND_STORAGE_KEY)).toBe('off');
    expect(new SoundPlayer().isEnabled()).toBe(false);
  });

  it('notifies subscribers when the setting changes', () => {
    const player = new SoundPlayer();
    const listener = vi.fn();
    const unsubscribe = player.subscribe(listener);
    player.setEnabled(false);
    unsubscribe();
    player.setEnabled(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does nothing without Web Audio support', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: vi.fn() } });
    expect(() => new SoundPlayer().play('wrong')).not.toThrow();
  });
});
