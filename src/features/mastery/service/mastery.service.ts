import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { loadDiagnosticItemsService } from '@/features/diagnostic/service/diagnostic-items.service';
import { masteryRepository } from '@/features/mastery/repository/mastery.repository';
import {
  computeMastery,
  emptyMastery,
  Observation,
  observationsFromDiagnostic,
  observationsFromPractice,
} from '@/features/mastery/service/mastery-model';
import { MasteryState } from '@/features/mastery/types/mastery.types';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { hintedWeight, SECONDARY_SKILL_WEIGHT } from '@/shared/const/course.const';

/** What a practice answer needs from its question. */
type PracticeQuestion = Pick<QuestionDocument, 'primarySkill' | 'difficulty'> & { skills: { skillCode: string }[] };

const practiceObservations = (q: PracticeQuestion, outcome: number, weight = 1): Observation[] =>
  observationsFromPractice({
    primarySkill: q.primarySkill ?? '',
    skills: q.skills.map((s) => s.skillCode),
    difficulty: q.difficulty,
    outcome,
    secondaryWeight: SECONDARY_SKILL_WEIGHT,
    weight,
  }).filter((o) => o.skillCode !== '');

/**
 * Recomputes the student's mastery from every finished diagnostic and every practice answer, in time order.
 * Idempotent: running it twice gives the same result, so no evidence is ever counted twice.
 */
export async function rebuildMasteryService(userId: string): Promise<MasteryState[]> {
  const [sessions, practice] = await Promise.all([
    diagnosticSessionRepository.findCompletedByUser(userId),
    attemptRepository.findPracticeByUser(userId),
  ]);
  const perSession = await Promise.all(sessions.map((s) => loadDiagnosticItemsService(s)));
  const questions = await questionRepository.findByIds([...new Set(practice.map((a) => a.questionId.toString()))]);
  const questionById = new Map(questions.map((q) => [q._id.toString(), q]));

  const timeline = [
    ...sessions.map((s, i) => ({ at: new Date(s.completedAt ?? 0).getTime(), observations: observationsFromDiagnostic(perSession[i]) })),
    ...practice.flatMap((a) => {
      const q = questionById.get(a.questionId.toString());
      const outcome = a.maxPoints > 0 ? a.points / a.maxPoints : 0;
      return q ? [{ at: new Date(a.createdAt).getTime(), observations: practiceObservations(q, outcome, hintedWeight(a.hintsUsed ?? 0)) }] : [];
    }),
  ].sort((a, b) => a.at - b.at);

  const states = [...computeMastery(timeline.flatMap((t) => t.observations)).values()];
  await masteryRepository.replaceForUser(userId, states);
  return states;
}

/** Incremental update after one practice answer (same result as a rebuild, without replaying everything). */
export async function recordPracticeMasteryService(userId: string, question: PracticeQuestion, outcome: number, weight = 1): Promise<void> {
  const observations = practiceObservations(question, outcome, weight);
  const current = await getMasteryMapService(userId, observations.map((o) => o.skillCode));
  const updated = computeMastery(observations, [...current.values()]);
  await Promise.all([...new Set(observations.map((o) => o.skillCode))].map((code) => masteryRepository.upsertOne(userId, updated.get(code)!)));
}

/** Builds mastery once for students whose diagnostics predate the mastery model (nothing stored yet). */
export async function ensureMasteryService(userId: string): Promise<void> {
  if ((await masteryRepository.findByUser(userId)).length === 0) await rebuildMasteryService(userId);
}

/** Mastery for every given skill; skills never observed get the prior. */
export async function getMasteryMapService(userId: string, skillCodes: string[]): Promise<Map<string, MasteryState>> {
  const stored = await masteryRepository.findByUser(userId);
  const byCode = new Map(
    stored.map((m) => [
      m.skillCode,
      {
        skillCode: m.skillCode,
        value: m.value,
        confidence: m.confidence,
        observations: m.observations,
        hardestCorrect: m.hardestCorrect ?? 0,
        stage: m.stage,
        mistakeCounts: {
          conceptual: m.mistakeCounts?.conceptual ?? 0,
          calculation: m.mistakeCounts?.calculation ?? 0,
          misread: m.mistakeCounts?.misread ?? 0,
          incomplete: m.mistakeCounts?.incomplete ?? 0,
        },
      },
    ])
  );
  return new Map(skillCodes.map((code) => [code, byCode.get(code) ?? emptyMastery(code)]));
}
