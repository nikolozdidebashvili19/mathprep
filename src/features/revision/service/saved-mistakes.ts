/**
 * Saved mistakes (T-022, pure): questions whose latest answer was wrong. Solving one correctly later takes it off the
 * list; the revision block keeps bringing these back until then (practice-picker prefers them for revision).
 */
export type HistoryRow = { questionId: string; answer: string; correct: boolean; at: Date };

export type OpenMistake = { questionId: string; lastAnswer: string; wrongCount: number; lastWrongAt: Date };

export function openMistakes(history: HistoryRow[], limit: number): OpenMistake[] {
  const byQuestion = new Map<string, OpenMistake & { solved: boolean }>();
  for (const row of [...history].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const entry = byQuestion.get(row.questionId) ?? { questionId: row.questionId, lastAnswer: '', wrongCount: 0, lastWrongAt: row.at, solved: false };
    if (row.correct) entry.solved = true;
    else Object.assign(entry, { lastAnswer: row.answer, wrongCount: entry.wrongCount + 1, lastWrongAt: row.at, solved: false });
    byQuestion.set(row.questionId, entry);
  }
  return [...byQuestion.values()]
    .filter((m) => !m.solved && m.wrongCount > 0)
    .sort((a, b) => b.lastWrongAt.getTime() - a.lastWrongAt.getTime())
    .slice(0, limit)
    .map(({ questionId, lastAnswer, wrongCount, lastWrongAt }) => ({ questionId, lastAnswer, wrongCount, lastWrongAt }));
}
