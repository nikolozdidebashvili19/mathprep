import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/course/service/course.service', () => ({ hasActiveCourseService: vi.fn().mockResolvedValue(false) }));
vi.mock('@/features/diagnostic/repository/diagnostic-session.repository', () => ({
  diagnosticSessionRepository: { countCompletedByUser: vi.fn() },
}));

import { getJourneyStepIndexService, journeyStepIndex } from '@/features/dashboard/service/journey.service';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { JOURNEY_STEPS } from '@/shared/const/dashboard.const';

const keyAt = (i: number) => JOURNEY_STEPS[i].key;

describe('journeyStepIndex', () => {
  it('starts at the diagnostic', () => {
    expect(keyAt(journeyStepIndex({ finishedDiagnostics: 0, hasActiveCourse: false }))).toBe('diagnostic');
  });

  it('moves to the course once a diagnostic is finished (diagnostic and knowledge map done)', () => {
    expect(keyAt(journeyStepIndex({ finishedDiagnostics: 1, hasActiveCourse: false }))).toBe('course');
  });
});

describe('journeyStepIndex with a course', () => {
  it('is in the course + weekly-check phase once a course runs', () => {
    expect(keyAt(journeyStepIndex({ finishedDiagnostics: 1, hasActiveCourse: true }))).toBe('weekly');
  });
});

describe('getJourneyStepIndexService', () => {
  it('reads the student\'s finished diagnostics', async () => {
    vi.mocked(diagnosticSessionRepository.countCompletedByUser).mockResolvedValue(2);
    expect(keyAt(await getJourneyStepIndexService('u1'))).toBe('course');
  });
});
