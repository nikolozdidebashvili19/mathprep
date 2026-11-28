import { History, RefreshCw, Sprout, Undo2, type LucideIcon } from 'lucide-react';

import { HintList } from '@/features/course/components/hint-list';
import { WorkPhotoPanel } from '@/features/course/components/work-photo-panel';
import { PracticeItemView } from '@/features/course/types/course.types';
import { TutorChat } from '@/features/tutor/components/tutor-chat';
import { ADAPTIVE_COPY, HINT_COPY, SCAFFOLD_COPY } from '@/shared/const/course.const';
import { LESSON_COPY } from '@/shared/const/lesson.const';

/** Why this question is here: inserted after a miss, an easier step first, back to the original, warm-up, review. */
function bannerFor(item: PracticeItemView): { icon: LucideIcon; text: string } | null {
  if (item.answered) return null;
  if (item.secondChance) return { icon: RefreshCw, text: LESSON_COPY.secondChance };
  if (item.reinforcement) {
    return { icon: Sprout, text: item.reinforcementSkillName ? ADAPTIVE_COPY.reinforcementFor(item.reinforcementSkillName) : ADAPTIVE_COPY.reinforcement };
  }
  if (item.hints.some((h) => h.kind === 'reinforce' && h.text === HINT_COPY.reinforceIntro)) return { icon: Undo2, text: ADAPTIVE_COPY.backToOriginal };
  if (item.warmup && item.skillName) return { icon: History, text: ADAPTIVE_COPY.warmup(item.skillName) };
  if (item.review && item.skillName) return { icon: History, text: ADAPTIVE_COPY.review(item.skillName) };
  return null;
}

export const ItemBanner = ({ item }: { item: PracticeItemView }) => {
  const banner = bannerFor(item);
  if (!banner) return null;
  const Icon = banner.icon;
  return (
    <p className="flex items-center gap-2 rounded-2xl border-2 border-sky bg-sky/10 p-3 text-sm font-extrabold text-sky">
      <Icon className="size-4 shrink-0" />
      {banner.text}
    </p>
  );
};

/** Free help shown before the student asks: solved together (1st question), one hint (2nd), on your own (3rd). */
const ScaffoldHelp = ({ item }: { item: PracticeItemView }) => {
  if (item.scaffold === 'solo') return item.hints.length === 0 ? <p className="text-sm font-extrabold text-primary">{SCAFFOLD_COPY.solo}</p> : null;
  if (item.scaffoldSteps.length === 0) return null;
  if (item.scaffold === 'light') return <HintList hints={item.scaffoldSteps} />;
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-sky bg-sky/5 p-3">
      <p className="font-extrabold text-sky">{SCAFFOLD_COPY.fullTitle}</p>
      <p className="text-sm font-semibold text-muted-foreground">{SCAFFOLD_COPY.fullBody}</p>
      <HintList hints={item.scaffoldSteps} />
    </section>
  );
};

type QuestionHelpProps = { item: PracticeItemView; sessionId: string | null; answered: boolean };

/**
 * Help on an open question: the free scaffold, the "I'm stuck" stages revealed so far (the photo of the working
 * inside stage 3) and the stuck-mode tutor. After answering only the revealed stages stay, for review.
 */
export const QuestionHelp = ({ item, sessionId, answered }: QuestionHelpProps) => (
  <>
    {!answered && <ScaffoldHelp item={item} />}
    <HintList
      hints={item.hints}
      stages={item.stuckStages}
      photoSlot={
        !answered && sessionId ? (
          <WorkPhotoPanel
            key={`photo-${item.index}`}
            sessionId={sessionId}
            itemIndex={item.index}
            mode="stuck"
            feedback={item.workPhoto?.mode === 'stuck' ? item.workPhoto : null}
            offerEasier={item.stuckStage < item.stuckStages}
          />
        ) : null
      }
    />
    {!answered && item.hints.length > 0 && sessionId && (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-muted-foreground">{HINT_COPY.stillStuck}</p>
        <TutorChat key={`stuck-${item.index}`} sessionId={sessionId} itemIndex={item.index} mode="stuck" />
      </div>
    )}
  </>
);
