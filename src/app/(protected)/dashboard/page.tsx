import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';
import { getJourneyStepIndexService } from '@/features/dashboard/service/journey.service';
import { getLatestWeakSkillsService } from '@/features/diagnostic/service/report.service';
import { getLearningStatsService } from '@/features/progress/service/progress.service';
import { DASHBOARD_COPY, type LearningStats } from '@/shared/const/dashboard.const';
import { DEFAULT_DAILY_GOAL_MINUTES } from '@/shared/const/progress.const';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

const EMPTY_STATS: LearningStats = { streakDays: 0, xp: 0, minutesToday: 0, dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES };

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0];
  const userId = (session?.user as SessionUser | undefined)?.id;
  const [latestDiagnostic, currentStepIndex, stats] = userId
    ? await Promise.all([getLatestWeakSkillsService(userId), getJourneyStepIndexService(userId), getLearningStatsService(userId)])
    : [null, 0, EMPTY_STATS];

  return (
    <DashboardOverview
      userName={firstName || DASHBOARD_COPY.fallbackName}
      currentStepIndex={currentStepIndex}
      stats={stats}
      latestDiagnostic={latestDiagnostic}
    />
  );
}
