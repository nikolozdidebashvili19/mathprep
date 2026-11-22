import { Sparkles, TriangleAlert } from 'lucide-react';

import { QuickSkillResult } from '@/features/diagnostic/types/diagnostic.types';
import { QUICK_CHECK_COPY } from '@/shared/const/diagnostic.const';

type SkillResultListsProps = {
  weak: QuickSkillResult[];
  strong: QuickSkillResult[];
};

/** "Where you struggle" (with the reasons, incl. mistakes found in the photos) and "strengths" chips. */
export const SkillResultLists = ({ weak, strong }: SkillResultListsProps) => (
  <>
    <section className="animate-rise-2 flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xl">
        <TriangleAlert className="size-5 text-streak" />
        {QUICK_CHECK_COPY.weakTitle}
      </h2>
      {weak.length === 0 ? (
        <p className="rounded-2xl border-2 bg-card p-4 font-semibold text-muted-foreground">{QUICK_CHECK_COPY.weakEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {weak.map((skill) => (
            <li key={skill.code} className="flex flex-col gap-2 rounded-2xl border-2 border-streak/40 bg-card p-4">
              <p className="font-extrabold">{skill.nameKa}</p>
              <ul className="flex flex-col gap-1">
                {skill.reasons.map((reason) => (
                  <li key={reason} className="text-sm font-semibold text-muted-foreground">
                    • {reason}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>

    {strong.length > 0 && (
      <section className="animate-rise-3 flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xl">
          <Sparkles className="size-5 text-primary" />
          {QUICK_CHECK_COPY.strongTitle}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {strong.map((skill) => (
            <li key={skill.code} className="rounded-full border-2 border-primary bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {skill.nameKa}
            </li>
          ))}
        </ul>
      </section>
    )}
  </>
);
