import { gradeAnswer } from '@/features/attempt/service/grading.service';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import { EvidenceItem } from '@/features/diagnostic/service/skill-evidence';
import { listSessionWorkPhotosService } from '@/features/handwriting/service/handwriting.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';

export type GradedDiagnosticItem = EvidenceItem & { question: QuestionDocument; answer: string; points: number };

/**
 * Every question of a diagnostic session graded, with what its photo analysis found (when usable).
 * Shared by the quick-check result and the mastery rebuild, so both read a session the same way.
 */
export async function loadDiagnosticItemsService(session: DiagnosticSessionDocument): Promise<GradedDiagnosticItem[]> {
  const sessionId = session._id.toString();
  const [photos, questions] = await Promise.all([
    listSessionWorkPhotosService(sessionId),
    questionRepository.findByIds(session.questionIds.map((id) => id.toString())),
  ]);
  const photoByQuestion = new Map(photos.map((p) => [p.questionId, p]));
  const answers = new Map(session.answers.map((a) => [a.questionId.toString(), a.answer ?? '']));

  return questions.map((question) => {
    const answer = answers.get(question._id.toString()) ?? '';
    const { correct, points } = gradeAnswer(question, answer);
    const analysis = photoByQuestion.get(question._id.toString())?.analysis;
    const usable = analysis?.status === 'done' && analysis.readable !== false;
    return {
      question,
      answer,
      points,
      primarySkill: question.primarySkill ?? '',
      difficulty: question.difficulty,
      answered: answer !== '',
      correct,
      analysis: usable ? { workShown: analysis.workShown ?? false, mistakes: analysis.mistakes, skillsShown: analysis.skillsShown } : undefined,
    };
  });
}
