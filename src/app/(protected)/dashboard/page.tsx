import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';
import { getJourneyStepIndexService } from '@/features/dashboard/service/journey.service';
import { getLatestWeakSkillsService } from '@/features/diagnostic/service/report.service';
import { DASHBOARD_COPY, type LearningStats } from '@/shared/const/dashboard.const';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

// Honest starting values until sessions are recorded (T-020 daily goal, T-024 streak/XP).
const EMPTY_STATS: LearningStats = { streakDays: 0, xp: 0, minutesToday: 0, dailyGoalMinutes: 30 };

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0];
  const userId = (session?.user as SessionUser | undefined)?.id;
  const [latestDiagnostic, currentStepIndex] = userId
    ? await Promise.all([getLatestWeakSkillsService(userId), getJourneyStepIndexService(userId)])
    : [null, 0];

  return (
    <DashboardOverview
      userName={firstName || DASHBOARD_COPY.fallbackName}
      currentStepIndex={currentStepIndex}
      stats={EMPTY_STATS}
      latestDiagnostic={latestDiagnostic}
    />
  );
}
