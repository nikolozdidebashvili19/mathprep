import { MASTERY_SOLID, MASTERY_WEAK_BELOW, SKILL_LEVELS } from '@/shared/const/domain.const';

export type MasteryBand = (typeof SKILL_LEVELS)[number];

/** Colour band of a mastery value: weak / mixed / strong, or untested when there is no evidence yet. */
export function masteryBand(value: number | null, observations = 1): MasteryBand {
  if (value === null || observations === 0) return 'untested';
  if (value < MASTERY_WEAK_BELOW) return 'weak';
  return value >= MASTERY_SOLID ? 'strong' : 'mixed';
}

/** Tailwind tone classes per band (same colours as the knowledge map). */
export const MASTERY_BAND_TONES: Record<MasteryBand, { text: string; fill: string; border: string }> = {
  weak: { text: 'text-streak', fill: 'bg-streak', border: 'border-streak' },
  mixed: { text: 'text-sky', fill: 'bg-sky', border: 'border-sky' },
  strong: { text: 'text-primary', fill: 'bg-primary', border: 'border-primary' },
  untested: { text: 'text-muted-foreground', fill: 'bg-muted-foreground', border: 'border-border' },
};
