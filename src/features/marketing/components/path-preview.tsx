import { Check, Lock, Sigma, Star, Trophy, type LucideIcon } from 'lucide-react';

import { HOME_HERO } from '@/shared/const/home.const';
import { cn } from '@/shared/lib/utils';

type PreviewNode = {
  icon: LucideIcon;
  state: 'done' | 'current' | 'locked';
  offset: string;
};

const PREVIEW_NODES: PreviewNode[] = [
  { icon: Check, state: 'done', offset: 'translate-x-0' },
  { icon: Check, state: 'done', offset: 'translate-x-10' },
  { icon: Star, state: 'current', offset: 'translate-x-4' },
  { icon: Lock, state: 'locked', offset: '-translate-x-8' },
  { icon: Trophy, state: 'locked', offset: 'translate-x-0' },
];

const NODE_CLASSES: Record<PreviewNode['state'], string> = {
  done: 'bg-primary text-primary-foreground shadow-edge-primary-lg',
  current: 'bg-primary text-primary-foreground shadow-edge-primary-lg ring-4 ring-primary/25 ring-offset-4 ring-offset-card',
  locked: 'bg-muted text-muted-foreground shadow-edge-lg',
};

/** Decorative preview of the lesson path shown on the landing page. */
export const PathPreview = () => (
  <div
    role="img"
    aria-label={HOME_HERO.previewLabel}
    className="relative flex flex-col items-center gap-5 rounded-3xl border-2 border-border bg-card px-8 py-10"
  >
    <span className="absolute left-5 top-5 inline-flex size-10 items-center justify-center rounded-xl bg-sky text-sky-foreground shadow-edge-sky">
      <Sigma className="size-5" strokeWidth={3} />
    </span>
    {PREVIEW_NODES.map(({ icon: Icon, state, offset }, i) => (
      <div key={i} className={cn('animate-pop flex flex-col items-center gap-2', offset, `animate-rise-${Math.min(i, 4)}`)}>
        {state === 'current' && (
          <span className="animate-bob rounded-xl border-2 border-border bg-background px-3 py-1 text-xs font-extrabold text-primary">
            {HOME_HERO.previewBubble}
          </span>
        )}
        <span className={cn('inline-flex size-16 items-center justify-center rounded-full', NODE_CLASSES[state])}>
          <Icon className="size-7" strokeWidth={2.75} />
        </span>
      </div>
    ))}
  </div>
);
