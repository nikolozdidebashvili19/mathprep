export type TutorTurn = { role: 'student' | 'tutor'; text: string };

export type TutorReply = { reply: string; remaining: number };

/** What the prompt needs: the question, both answers and the stored (verified) solution. */
export type TutorContext = {
  questionText: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  studentAnswer: string;
  solutionSteps: string[];
  skillName: string | null;
  /** Stuck mode: the ladder rungs the student has already seen, so the tutor builds on them. */
  seenGuidance: string[];
};
