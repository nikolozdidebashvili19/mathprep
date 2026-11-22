/**
 * T-016 mastery model (Layer 3), pure: no DB. Elo-style update per observation, on a 0–1 mastery scale.
 *
 * - A question of difficulty d (1–5) sits at t = 0.1 + 0.2 × (d − 1) on the mastery scale (0.1 … 0.9).
 *   Expected success = sigmoid(6 × (mastery − t)), so a correct hard answer raises mastery more than an easy one,
 *   and a wrong easy answer lowers it more than a wrong hard one.
 * - Step size shrinks as observations grow (early answers move a lot, later ones fine-tune).
 * - Confidence = 1 − e^(−observations / 4).
 * - Capped below MASTERY_SOLID until the skill was answered correctly at EXAM_LEVEL_DIFFICULTY or above
 *   ("2 of 2 easy questions right does not make a skill mastered").
 * - Mistake types are counted; CONCEPTUAL_RESET_COUNT conceptual mistakes force the foundation stage.
 */
import { MistakeType } from '@/features/handwriting/types/handwriting.types';
import { MasteryState, MasteryStage } from '@/features/mastery/types/mastery.types';
import {
  CONCEPTUAL_RESET_COUNT,
  EXAM_LEVEL_DIFFICULTY,
  MASTERY_PRIOR,
  MASTERY_SOLID,
} from '@/shared/const/domain.const';

export type Observation = {
  skillCode: string;
  difficulty: number;
  /** 1 = correct, 0 = wrong; partial credit in between. */
  outcome: number;
  /** 0–1: how much this observation should count (e.g. 0.5 for a correct answer with no working shown). */
  weight: number;
  mistake?: MistakeType;
};

const BASE_STEP = 0.3;

export const emptyMastery = (skillCode: string): MasteryState => ({
  skillCode,
  value: MASTERY_PRIOR,
  confidence: 0,
  observations: 0,
  hardestCorrect: 0,
  stage: 'foundation',
  mistakeCounts: { conceptual: 0, calculation: 0, misread: 0, incomplete: 0 },
});

export const difficultyTarget = (difficulty: number) => 0.1 + 0.2 * (Math.min(5, Math.max(1, difficulty)) - 1);

export function stageFor(value: number, conceptualMistakes: number): MasteryStage {
  if (conceptualMistakes >= CONCEPTUAL_RESET_COUNT || value < 0.3) return 'foundation';
  if (value < 0.5) return 'basic';
  if (value < MASTERY_SOLID) return 'independent';
  return value < 0.85 ? 'exam' : 'advanced';
}

export function applyObservation(state: MasteryState, obs: Observation): MasteryState {
  const expected = 1 / (1 + Math.exp(-6 * (state.value - difficultyTarget(obs.difficulty))));
  const step = (BASE_STEP / (1 + 0.15 * state.observations)) * obs.weight;
  const hardestCorrect = obs.outcome >= 1 ? Math.max(state.hardestCorrect, obs.difficulty) : state.hardestCorrect;
  const cap = hardestCorrect >= EXAM_LEVEL_DIFFICULTY ? 1 : MASTERY_SOLID - 0.05;
  const value = Math.round(Math.min(cap, Math.max(0, state.value + step * (obs.outcome - expected))) * 1000) / 1000;
  const observations = state.observations + 1;
  const mistakeCounts = obs.mistake ? { ...state.mistakeCounts, [obs.mistake]: state.mistakeCounts[obs.mistake] + 1 } : state.mistakeCounts;

  return {
    ...state,
    value,
    observations,
    hardestCorrect,
    mistakeCounts,
    confidence: Math.round((1 - Math.exp(-observations / 4)) * 1000) / 1000,
    stage: stageFor(value, mistakeCounts.conceptual),
  };
}

/** A graded diagnostic answer plus what the photo analysis found (same shape the result screen uses). */
export type DiagnosticObservationInput = {
  primarySkill: string;
  difficulty: number;
  correct: boolean;
  analysis?: { workShown: boolean; mistakes: { type: MistakeType; skillCode: string }[]; skillsShown: string[] };
};

/**
 * Diagnostic answers → observations. The photo decides who is blamed: a mistake counts against its own skill
 * (conceptual fully, slips partly); the question's skill takes a lighter hit when the error was elsewhere.
 * Correct with no working shown counts half (could be a guess); skills applied correctly in the photo count a little.
 */
export function observationsFromDiagnostic(items: DiagnosticObservationInput[]): Observation[] {
  return items.flatMap(({ primarySkill, difficulty, correct, analysis }) => {
    const mistakes = (analysis?.mistakes ?? []).filter((m) => !(correct && m.type === 'incomplete'));
    const blamed = new Set(mistakes.map((m) => m.skillCode));
    // A wrong answer whose mistake is on the question's own skill is one observation carrying that mistake type.
    const ownMistake = correct ? undefined : mistakes.find((m) => m.skillCode === primarySkill)?.type;
    const own: Observation = correct
      ? { skillCode: primarySkill, difficulty, outcome: 1, weight: analysis && !analysis.workShown ? 0.5 : 1 }
      : { skillCode: primarySkill, difficulty, outcome: 0, weight: mistakes.length > 0 && !ownMistake ? 0.5 : 1, mistake: ownMistake };
    const elsewhere = mistakes
      .filter((m) => correct || m.skillCode !== primarySkill)
      .map((m): Observation => ({ skillCode: m.skillCode, difficulty, outcome: 0, weight: m.type === 'conceptual' ? 1 : 0.6, mistake: m.type }));
    const shown = (analysis?.skillsShown ?? [])
      .filter((code) => code !== primarySkill && !blamed.has(code))
      .map((code): Observation => ({ skillCode: code, difficulty, outcome: 1, weight: 0.4 }));
    return [own, ...elsewhere, ...shown];
  });
}

/**
 * A practice answer (no photo): the question's main skill fully, its other tagged skills a little.
 * `weight` (default 1) scales both, e.g. lowered when hints were used before answering.
 */
export function observationsFromPractice(input: {
  primarySkill: string;
  skills: string[];
  difficulty: number;
  outcome: number;
  secondaryWeight: number;
  weight?: number;
}): Observation[] {
  const w = input.weight ?? 1;
  const others = input.skills.filter((c) => c !== input.primarySkill);
  return [
    { skillCode: input.primarySkill, difficulty: input.difficulty, outcome: input.outcome, weight: w },
    ...others.map((skillCode) => ({ skillCode, difficulty: input.difficulty, outcome: input.outcome, weight: input.secondaryWeight * w })),
  ];
}

/** Folds observations (in time order) into per-skill mastery, starting from `initial` (or the prior). */
export function computeMastery(observations: Observation[], initial: MasteryState[] = []): Map<string, MasteryState> {
  const states = new Map(initial.map((s) => [s.skillCode, s]));
  for (const obs of observations) {
    states.set(obs.skillCode, applyObservation(states.get(obs.skillCode) ?? emptyMastery(obs.skillCode), obs));
  }
  return states;
}
