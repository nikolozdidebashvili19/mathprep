import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/course/repository/practice-session.repository', () => ({ practiceSessionRepository: { findById: vi.fn() } }));
vi.mock('@/features/question/repository/question.repository', () => ({ questionRepository: { findByIds: vi.fn() } }));
vi.mock('@/features/skill/repository/skill.repository', () => ({ skillRepository: { findAll: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/features/tutor/repository/tutor-message.repository', () => ({
  tutorMessageRepository: { countModelCallsSince: vi.fn(), findReply: vi.fn(), create: vi.fn() },
}));
vi.mock('@/shared/lib/ai-vision', () => ({
  aiVision: { generateJson: vi.fn(), describe: () => ({ provider: 'gemini', model: 'm' }) },
}));

import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { PracticeSessionDocument, PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument, QuestionModel } from '@/features/question/schema/question.schema';
import { tutorMessageRepository } from '@/features/tutor/repository/tutor-message.repository';
import { askTutorService, buildTutorPrompt, normalizeMessage } from '@/features/tutor/service/tutor.service';
import { TUTOR_DAILY_LIMIT } from '@/shared/const/tutor.const';
import { aiVision } from '@/shared/lib/ai-vision';

const USER = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const Q1 = new Types.ObjectId();
const repo = vi.mocked(tutorMessageRepository);

const session = (answered: boolean): PracticeSessionDocument =>
  new PracticeSessionModel({
    _id: SESSION,
    userId: USER,
    courseId: new Types.ObjectId(),
    dayIndex: 0,
    items: [{ blockIndex: 0, kind: 'practice', skillCode: 'A4', questionId: Q1, answer: 'ბ', ...(answered ? { answeredAt: new Date() } : {}) }],
  }).toObject();

const question: QuestionDocument = new QuestionModel({
  _id: Q1,
  code: 'Q',
  source: 'naec',
  type: 'multiple_choice',
  text: 'ამოხსენით $2x=6$',
  options: [{ key: 'ა', text: '$3$' }, { key: 'ბ', text: '$4$' }],
  answer: 'ა',
  maxPoints: 1,
  difficulty: 1,
  solutionSteps: ['ორივე მხარე გავყოთ $2$-ზე', '$x=3$'],
}).toObject();

const input = { sessionId: SESSION.toString(), itemIndex: 0, message: 'რატომ არის 3?', history: [] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session(true));
  vi.mocked(questionRepository.findByIds).mockResolvedValue([question]);
  repo.countModelCallsSince.mockResolvedValue(3);
  repo.findReply.mockResolvedValue(null);
});

describe('buildTutorPrompt', () => {
  it('gives the model the problem, both answers, the stored solution and recent turns', () => {
    const prompt = buildTutorPrompt(
      { questionText: 'Q?', options: [{ key: 'ა', text: '1' }], correctAnswer: 'ა', studentAnswer: 'ბ', solutionSteps: ['s1'], skillName: 'წილადები' },
      [{ role: 'student', text: 'hi' }],
      'რატომ?'
    );
    expect(prompt).toContain('Correct answer: ა. Student answered: ბ.');
    expect(prompt).toContain('1. s1');
    expect(prompt).toContain('Student: hi');
    expect(prompt).toContain('(topic: წილადები)');
  });

  it('normalizes messages for the cache', () => {
    expect(normalizeMessage('  რატომ   არის  3? ')).toBe('რატომ არის 3?');
  });
});

describe('askTutorService', () => {
  it('only helps after the question was answered, and only its owner', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session(false));
    expect((await askTutorService(USER.toString(), input)).data).toEqual({ error: 'NOT_ANSWERED' });
    expect((await askTutorService(new Types.ObjectId().toString(), input)).status).toBe(404);
  });

  it('reuses a cached reply for the same first question at zero tokens', async () => {
    repo.findReply.mockResolvedValue('ორივე მხარე $2$-ზე გაყავი.');
    const res = await askTutorService(USER.toString(), input);
    expect(res.data).toEqual({ reply: 'ორივე მხარე $2$-ზე გაყავი.', remaining: TUTOR_DAILY_LIMIT - 3 });
    expect(aiVision.generateJson).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ cached: true }));
  });

  it('enforces the daily limit for model calls', async () => {
    repo.countModelCallsSince.mockResolvedValue(TUTOR_DAILY_LIMIT);
    expect((await askTutorService(USER.toString(), input)).status).toBe(429);
    expect(aiVision.generateJson).not.toHaveBeenCalled();
  });

  it('calls the model with the stored solution and saves the reply', async () => {
    vi.mocked(aiVision.generateJson).mockResolvedValue('{"reply": "შენ $4$ აირჩიე, მაგრამ $2\\\\cdot 4=8$."}');
    const res = await askTutorService(USER.toString(), input);
    expect(res.data).toEqual({ reply: 'შენ $4$ აირჩიე, მაგრამ $2\\cdot 4=8$.', remaining: TUTOR_DAILY_LIMIT - 4 });
    expect(vi.mocked(aiVision.generateJson).mock.calls[0][0].prompt).toContain('ორივე მხარე გავყოთ');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ cached: false, provider: 'gemini' }));
  });

  it('reports a failed model call without saving', async () => {
    vi.mocked(aiVision.generateJson).mockRejectedValue(new Error('503'));
    expect((await askTutorService(USER.toString(), input)).data).toEqual({ error: 'TUTOR_FAILED' });
    expect(repo.create).not.toHaveBeenCalled();
  });
});
