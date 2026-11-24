import { hasActiveCourseService } from '@/features/course/service/course.service';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { JOURNEY_STEPS } from '@/shared/const/dashboard.const';

export type JourneyProgress = { finishedDiagnostics: number; hasActiveCourse: boolean };

const stepIndex = (key: string) => JOURNEY_STEPS.findIndex((s) => s.key === key);

/**
 * Where the student is on the lesson path. A finished diagnostic produces the knowledge map at once, so both
 * are done and the course setup is next; once a course runs, the student is in the course + weekly-check phase.
 * (The final mock step follows when weekly checks exist, T-023 / T-025.)
 */
export function journeyStepIndex({ finishedDiagnostics, hasActiveCourse }: JourneyProgress): number {
  if (hasActiveCourse) return stepIndex('weekly');
  return finishedDiagnostics > 0 ? stepIndex('course') : stepIndex('diagnostic');
}

export async function getJourneyStepIndexService(userId: string): Promise<number> {
  const [finishedDiagnostics, hasActiveCourse] = await Promise.all([
    diagnosticSessionRepository.countCompletedByUser(userId),
    hasActiveCourseService(userId),
  ]);
  return journeyStepIndex({ finishedDiagnostics, hasActiveCourse });
}
