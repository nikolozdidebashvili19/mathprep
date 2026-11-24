'use client';
import { Volume2, VolumeX } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { SOUND_COPY } from '@/shared/const/sound.const';
import { useSoundEnabled } from '@/shared/hooks/use-sound-enabled';
import { sound } from '@/shared/lib/sound';

export const SoundToggle = () => {
  const enabled = useSoundEnabled();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={!enabled}
      aria-label={enabled ? SOUND_COPY.mute : SOUND_COPY.unmute}
      title={enabled ? SOUND_COPY.mute : SOUND_COPY.unmute}
      onClick={() => sound.setEnabled(!enabled)}
      className="text-muted-foreground hover:text-foreground"
    >
      {enabled ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
    </Button>
  );
};
