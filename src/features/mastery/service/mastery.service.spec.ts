import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/diagnostic/repository/diagnostic-session.repository', () => ({
  diagnosticSessionRepository: { findCompletedByUser: vi.fn() },
}));
vi.mock('@/features/diagnostic/service/diagnostic-items.service', () => ({ loadDiagnosticItemsService: vi.fn() }));
vi.mock('@/features/attempt/repository/attempt.repository', () => ({
  attemptRepository: { findPracticeByUser: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/features/question/repository/question.repository', () => ({
  questionRepository: { findByIds: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/features/mastery/repository/mastery.repository', () => ({
  masteryRepository: { findByUser: vi.fn(), replaceForUser: vi.fn(), upsertOne: vi.fn() },
}));

import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import { GradedDiagnosticItem, loadDiagnosticItemsService } from '@/features/diagnostic/service/diagnostic-items.service';
import { masteryRepository } from '@/features/mastery/repository/mastery.repository';
import { MasteryDocument } from '@/features/mastery/schema/mastery.schema';
import { computeMastery, observationsFromDiagnostic } from '@/features/mastery/service/mastery-model';
import {
  ensureMasteryService,
  getMasteryMapService,
  rebuildMasteryService,
  recordPracticeMasteryService,
} from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { MASTERY_PRIOR } from '@/shared/const/domain.const';

const USER = new Types.ObjectId().toString();
const older = { _id: new Types.ObjectId(), completedAt: new Date('2026-11-01') } as DiagnosticSessionDocument;
const newer = { _id: new Types.ObjectId(), completedAt: new Date('2026-11-10') } as DiagnosticSessionDocument;
const item = (primarySkill: string, correct: boolean) => ({ primarySkill, difficulty: 3, correct, answered: true }) as GradedDiagnosticItem;

beforeEach(() => vi.clearAllMocks());

describe('rebuildMasteryService', () => {
  it('replays every finished diagnostic oldest first and replaces the stored mastery', async () => {
    // The repository returns newest first.
    vi.mocked(diagnosticSessionRepository.findCompletedByUser).mockResolvedValue([newer, older]);
    vi.mocked(loadDiagnosticItemsService).mockImplementation(async (s) => (s === older ? [item('A7', false)] : [item('A7', true)]));

    const states = await rebuildMasteryService(USER);

    // Order matters in an Elo update: the result must equal "older (wrong) first, then newer (correct)".
    const expected = computeMastery(observationsFromDiagnostic([item('A7', false), item('A7', true)])).get('A7');
    expect(states).toHaveLength(1);
    expect(states[0]).toEqual(expected);
    expect(masteryRepository.replaceForUser).toHaveBeenCalledWith(USER, states);
  });
});

describe('getMasteryMapService', () => {
  it('fills unobserved skills with the prior', async () => {
    vi.mocked(masteryRepository.findByUser).mockResolvedValue([
      { skillCode: 'A7', value: 0.8, confidence: 0.5, observations: 3, hardestCorrect: 4, stage: 'exam', mistakeCounts: {} } as MasteryDocument,
    ]);
    const map = await getMasteryMapService(USER, ['A7', 'G7']);
    expect(map.get('A7')).toMatchObject({ value: 0.8, stage: 'exam', mistakeCounts: { conceptual: 0 } });
    expect(map.get('G7')).toMatchObject({ value: MASTERY_PRIOR, observations: 0 });
  });
});

describe('ensureMasteryService', () => {
  it('rebuilds only when nothing is stored yet', async () => {
    vi.mocked(diagnosticSessionRepository.findCompletedByUser).mockResolvedValue([]);
    vi.mocked(masteryRepository.findByUser).mockResolvedValueOnce([{ skillCode: 'A7' } as MasteryDocument]);
    await ensureMasteryService(USER);
    expect(masteryRepository.replaceForUser).not.toHaveBeenCalled();

    vi.mocked(masteryRepository.findByUser).mockResolvedValueOnce([]);
    await ensureMasteryService(USER);
    expect(masteryRepository.replaceForUser).toHaveBeenCalledWith(USER, []);
  });
});

describe('practice evidence', () => {
  const practiceQuestion = {
    primarySkill: 'A7',
    skills: [{ skillCode: 'A7' }, { skillCode: 'N2' }],
    difficulty: 3,
  };
  const questionDoc = { _id: new Types.ObjectId(), primarySkill: 'A7', difficulty: 3 } as QuestionDocument;

  it('replays practice answers in time order together with diagnostics', async () => {
    vi.mocked(diagnosticSessionRepository.findCompletedByUser).mockResolvedValue([older]);
    vi.mocked(loadDiagnosticItemsService).mockResolvedValue([item('A7', false)]);
    vi.mocked(attemptRepository.findPracticeByUser).mockResolvedValue([
      { questionId: questionDoc._id, points: 1, maxPoints: 1, createdAt: new Date('2026-11-05') },
    ]);
    vi.mocked(questionRepository.findByIds).mockResolvedValue([Object.assign(questionDoc, { skills: practiceQuestion.skills })]);

    const states = await rebuildMasteryService(USER);
    const byCode = new Map(states.map((s) => [s.skillCode, s]));
    expect(byCode.get('A7')?.observations).toBe(2);
    expect(byCode.get('N2')?.observations).toBe(1);
  });

  it('updates the stored mastery incrementally after one practice answer', async () => {
    vi.mocked(masteryRepository.findByUser).mockResolvedValue([]);
    await recordPracticeMasteryService(USER, practiceQuestion, 1);
    const saved = vi.mocked(masteryRepository.upsertOne).mock.calls.map((c) => c[1]);
    expect(saved.map((s) => s.skillCode)).toEqual(['A7', 'N2']);
    expect(saved[0].value - MASTERY_PRIOR).toBeGreaterThan(saved[1].value - MASTERY_PRIOR);
  });
});
