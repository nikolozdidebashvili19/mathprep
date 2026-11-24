import { SkillProgress } from '@/features/progress/types/progress.types';
import { SegmentedBar } from '@/shared/components/ui/segmented-bar';
import { PROGRESS_BAR_SEGMENTS, PROGRESS_COPY } from '@/shared/const/progress.const';
import { REPORT_COPY } from '@/shared/const/report.const';
import { cn } from '@/shared/lib/utils';
import { MASTERY_BAND_TONES, masteryBand } from '@/shared/utils/mastery-band';

type SkillMasteryListProps = {
  skills: SkillProgress[];
};

/** Mastery per skill as chunky bars coloured by band (weak amber, mixed sky, strong green, untested muted). */
export const SkillMasteryList = ({ skills }: SkillMasteryListProps) =>
  skills.length === 0 ? (
    <p className="text-sm font-semibold text-muted-foreground">{PROGRESS_COPY.masteryEmpty}</p>
  ) : (
    <ul className="flex flex-col gap-3">
      {skills.map((skill) => {
        const band = masteryBand(skill.value, skill.observations);
        const tone = MASTERY_BAND_TONES[band];
        return (
          <li key={skill.code} className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold">{skill.nameKa}</span>
              <span className={cn('shrink-0 text-xs font-extrabold', tone.text)}>
                {band === 'untested' ? REPORT_COPY.levels.untested : `${Math.round(skill.value * 100)}%`}
              </span>
            </span>
            <SegmentedBar
              ratio={band === 'untested' ? 0 : skill.value}
              segments={PROGRESS_BAR_SEGMENTS}
              fillClassName={tone.fill}
              label={skill.nameKa}
              valueText={REPORT_COPY.levels[band]}
            />
          </li>
        );
      })}
    </ul>
  );
