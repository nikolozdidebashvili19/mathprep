import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/course/repository/practice-session.repository', () => ({ practiceSessionRepository: { findById: vi.fn() } }));
vi.mock('@/features/question/repository/question.repository', () => ({ questionRepository: { findByIds: vi.fn() } }));
vi.mock('@/features/skill/repository/skill.repository', () => ({ skillRepository: { findAll: vi.fn() } }));
vi.mock('@/features/handwriting/service/handwriting.service', () => ({
  analyzePracticePhotoService: vi.fn(),
  countPracticePhotosTodayService: vi.fn(),
  findWorkPhotoService: vi.fn(),
  savePracticePhotoService: vi.fn(),
}));

import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import { practicePhotoService } from '@/features/course/service/practice-photo.service';
import {
  analyzePracticePhotoService,
  countPracticePhotosTodayService,
  findWorkPhotoService,
  savePracticePhotoService,
} from '@/features/handwriting/service/handwriting.service';
import { WorkPhotoSummary } from '@/features/handwriting/types/handwriting.types';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionModel } from '@/features/question/schema/question.schema';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { PRACTICE_PHOTO_DAILY_LIMIT, PRACTICE_PHOTO_PER_QUESTION } from '@/shared/const/course.const';

const USER = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const Q = new Types.ObjectId();
const file = { mimeType: 'image/jpeg', data: Buffer.from('jpeg') };
const input = { sessionId: SESSION.toString(), itemIndex: 0 };

const question = new QuestionModel({
  _id: Q,
  source: 'naec',
  code: 'Q',
  type: 'multiple_choice',
  text: 't',
  options: [{ key: 'ა', text: '1' }],
  solutionSteps: ['s1', 's2', 's3'],
  answer: 'ა',
  maxPoints: 1,
  difficulty: 2,
  primarySkill: 'A4',
  skills: [{ skillCode: 'A4', isPrimary: true }],
}).toObject();

const session = (item: Record<string, unknown>) =>
  new PracticeSessionModel({
    _id: SESSION,
    userId: USER,
    courseId: new Types.ObjectId(),
    dayIndex: 0,
    items: [{ blockIndex: 0, kind: 'practice', skillCode: 'A4', questionId: Q, ...item }],
  }).toObject();

const analysed = (over: Partial<WorkPhotoSummary> = {}): WorkPhotoSummary => ({
  id: 'p',
  questionId: Q.toString(),
  mode: 'stuck',
  uploads: 1,
  analysis: {
    status: 'done',
    readable: true,
    matchesQuestion: true,
    progress: 'mistake',
    where: 'w',
    issue: 'i',
    nextStep: 'n',
    mistakes: [{ type: 'calculation', skillCode: 'N2', description: 'd' }],
    skillsShown: [],
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(questionRepository.findByIds).mockResolvedValue([question]);
  vi.mocked(skillRepository.findAll).mockResolvedValue([
    { code: 'A4', nameKa: 'წრფივი', nameEn: 'Linear', prerequisites: ['N2'] },
    { code: 'N2', nameKa: 'წილადები', nameEn: 'Fractions', prerequisites: [] },
  ] as SkillDocument[]);
  vi.mocked(findWorkPhotoService).mockResolvedValue(null);
  vi.mocked(countPracticePhotosTodayService).mockResolvedValue(0);
  vi.mocked(savePracticePhotoService).mockResolvedValue({ photoId: 'p', uploads: 1 });
  vi.mocked(analyzePracticePhotoService).mockResolvedValue(analysed());
});

describe('practicePhotoService', () => {
  it('before answering, only once the photo stage of "I\'m stuck" is open', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session({ stuckStage: 0 }));
    expect((await practicePhotoService(USER.toString(), input, file)).data).toEqual({ error: 'PHOTO_NOT_OPEN' });
  });

  it('stuck mode: analyses the working with the question skills and their prerequisites, and names the weakness', async () => {
    // No guidance, 3 solution steps: stage 1 = one hint, stage 2 = the photo.
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session({ stuckStage: 2 }));
    const res = await practicePhotoService(USER.toString(), input, file);
    expect(vi.mocked(analyzePracticePhotoService).mock.calls[0][1]).toMatchObject({ mode: 'stuck', skills: [{ code: 'A4' }, { code: 'N2' }] });
    expect(res.data).toEqual({
      mode: 'stuck',
      status: 'done',
      progress: 'mistake',
      where: 'w',
      issue: 'i',
      nextStep: 'n',
      weakSkillName: 'წილადები',
      retakesLeft: PRACTICE_PHOTO_PER_QUESTION - 1,
    });
  });

  it('after a wrong answer: "find my mistake"; not after a correct one', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session({ answeredAt: new Date(), answer: 'ბ', correct: false }));
    await practicePhotoService(USER.toString(), input, file);
    expect(vi.mocked(savePracticePhotoService).mock.calls[0][0]).toMatchObject({ mode: 'mistake' });
    expect(vi.mocked(analyzePracticePhotoService).mock.calls[0][1]).toMatchObject({ mode: 'mistake', studentAnswer: 'ბ' });

    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session({ answeredAt: new Date(), answer: 'ა', correct: true }));
    expect((await practicePhotoService(USER.toString(), input, file)).data).toEqual({ error: 'ALREADY_CORRECT' });
  });

  it('an unclear photo comes back as such (retake), with no weakness named', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session({ stuckStage: 2 }));
    vi.mocked(analyzePracticePhotoService).mockResolvedValue(analysed({ analysis: { ...analysed().analysis, readable: false } }));
    expect((await practicePhotoService(USER.toString(), input, file)).data).toMatchObject({ status: 'unreadable', weakSkillName: null });
  });

  it('limits photos per question and per day, and refuses other students', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(session({ stuckStage: 2 }));
    vi.mocked(findWorkPhotoService).mockResolvedValue(analysed({ uploads: PRACTICE_PHOTO_PER_QUESTION }));
    expect((await practicePhotoService(USER.toString(), input, file)).data).toEqual({ error: 'QUESTION_PHOTO_LIMIT' });

    vi.mocked(findWorkPhotoService).mockResolvedValue(null);
    vi.mocked(countPracticePhotosTodayService).mockResolvedValue(PRACTICE_PHOTO_DAILY_LIMIT);
    expect((await practicePhotoService(USER.toString(), input, file)).data).toEqual({ error: 'PHOTO_DAILY_LIMIT' });

    expect((await practicePhotoService(new Types.ObjectId().toString(), input, file)).status).toBe(404);
    expect(savePracticePhotoService).not.toHaveBeenCalled();
  });
});
