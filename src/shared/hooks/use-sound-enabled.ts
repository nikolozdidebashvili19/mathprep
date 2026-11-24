'use client';
import { useSyncExternalStore } from 'react';

import { sound } from '@/shared/lib/sound';

const subscribe = (listener: () => void) => sound.subscribe(listener);
const getSnapshot = () => sound.isEnabled();
const getServerSnapshot = () => true;

/** Whether feedback sounds are on, kept in sync with the mute toggle. */
export const useSoundEnabled = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
