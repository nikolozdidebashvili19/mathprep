import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/handwriting/repository/work-photo.repository', () => ({
  workPhotoRepository: { findImageById: vi.fn(), setAnalysis: vi.fn(), findById: vi.fn() },
}));
vi.mock('@/shared/lib/ai-vision', () => ({
  aiVision: { generateJson: vi.fn(), describe: () => ({ provider: 'gemini', model: 'test-model' }) },
}));

import { workPhotoRepository } from '@/features/handwriting/repository/work-photo.repository';
import { analyzePracticePhotoService } from '@/features/handwriting/service/handwriting.service';
import { buildPracticePhotoPrompt, dropLeakingSentences } from '@/features/handwriting/service/practice-photo';
import { PracticePhotoContext } from '@/features/handwriting/types/handwriting.types';
import { aiVision } from '@/shared/lib/ai-vision';

const repo = vi.mocked(workPhotoRepository);
const model = vi.mocked(aiVision);
const PHOTO_ID = new Types.ObjectId().toString();

const ctx: PracticePhotoContext = {
  mode: 'stuck',
  question: { text: 'ამოხსენით $2x+3=11$', options: [{ key: 'ა', text: '$x=4$' }, { key: 'ბ', text: '$x=7$' }], answer: 'ა' },
  studentAnswer: '',
  solutionSteps: ['$2x=11-3$', '$2x=8$', 'პასუხი: $x=4$'],
  skills: [{ code: 'A4', nameKa: 'წრფივი განტოლებები', nameEn: 'Linear equations' }],
};

describe('buildPracticePhotoPrompt', () => {
  it('stuck: reads only what is written, never guesses, never gives the answer; the key itself is not in the prompt', () => {
    const prompt = buildPracticePhotoPrompt(ctx);
    expect(prompt).toContain('NOT answered yet');
    expect(prompt).toContain('NEVER give the final result');
    expect(prompt).toContain('never guess');
    expect(prompt).toContain('"readable": false');
    expect(prompt).toContain('A4: Linear equations');
    expect(prompt).not.toContain('correct: ა');
  });

  it('mistake: names both answers and asks how to fix the wrong step', () => {
    const prompt = buildPracticePhotoPrompt({ ...ctx, mode: 'mistake', studentAnswer: 'ბ' });
    expect(prompt).toContain('The student chose ბ, which is wrong (correct: ა)');
    expect(prompt).toContain('how to fix that step');
  });
});

describe('dropLeakingSentences', () => {
  const finalStep = ctx.solutionSteps[2];
  it('removes only the sentences that give the answer away', () => {
    expect(dropLeakingSentences('გადაიტანე 3 მარჯვნივ. მიიღებ $x = 4$.', '$x=4$', finalStep)).toBe('გადაიტანე 3 მარჯვნივ.');
    expect(dropLeakingSentences('სწორი პასუხია ა.', '$x=4$', finalStep)).toBe('');
    expect(dropLeakingSentences('ახლა ორივე მხარე გაყავი 2-ზე.', '$x=4$', finalStep)).toBe('ახლა ორივე მხარე გაყავი 2-ზე.');
  });
});

describe('analyzePracticePhotoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.findImageById.mockResolvedValue({ userId: 'u', mimeType: 'image/jpeg', data: Buffer.from('jpeg') });
    repo.findById.mockResolvedValue(null);
  });

  const reply = (over: Record<string, unknown>) =>
    JSON.stringify({ readable: true, matchesQuestion: true, progress: 'stopped', where: 'w', issue: 'i', nextStep: 'n', mistakes: [], ...over });

  it('stuck: drops a next step that names the answer, keeps the rest, and keeps only allowed skill codes', async () => {
    model.generateJson.mockResolvedValue(
      reply({
        progress: 'mistake',
        nextStep: 'ორივე მხარე გაყავი 2-ზე. მიიღებ $x=4$.',
        mistakes: [
          { type: 'calculation', skillCode: 'A4', description: 'd' },
          { type: 'conceptual', skillCode: 'ZZ', description: 'unknown' },
        ],
      })
    );
    await analyzePracticePhotoService(PHOTO_ID, ctx);
    expect(repo.setAnalysis).toHaveBeenCalledWith(
      PHOTO_ID,
      expect.objectContaining({ status: 'done', progress: 'mistake', nextStep: 'ორივე მხარე გაყავი 2-ზე.', mistakes: [expect.objectContaining({ skillCode: 'A4' })] })
    );
  });

  it('an unreadable photo stores no guidance and no evidence (the student retakes it)', async () => {
    model.generateJson.mockResolvedValue(reply({ readable: false, mistakes: [{ type: 'calculation', skillCode: 'A4', description: 'guess' }] }));
    await analyzePracticePhotoService(PHOTO_ID, ctx);
    expect(repo.setAnalysis).toHaveBeenCalledWith(PHOTO_ID, expect.objectContaining({ readable: false, where: '', issue: '', nextStep: '', mistakes: [] }));
  });

  it('a failed model call is stored as failed, never thrown', async () => {
    model.generateJson.mockRejectedValue(new Error('Gemini 503'));
    await expect(analyzePracticePhotoService(PHOTO_ID, ctx)).resolves.toBeNull();
    expect(repo.setAnalysis).toHaveBeenCalledWith(PHOTO_ID, expect.objectContaining({ status: 'failed', error: 'Gemini 503' }));
  });
});

describe('ModelPracticePhotoSchema', () => {
  it('drops a malformed mistake instead of failing the analysis; an unknown progress becomes "stopped"', async () => {
    const { ModelPracticePhotoSchema } = await import('@/features/handwriting/validations/handwriting.validation');
    const parsed = ModelPracticePhotoSchema.parse({
      readable: true,
      progress: 'confused',
      mistakes: [{ type: 'typo', skillCode: 'A4', description: 'x' }, { type: 'calculation', skillCode: 'A4', description: 'ok' }],
    });
    expect(parsed.progress).toBe('stopped');
    expect(parsed.mistakes).toEqual([{ type: 'calculation', skillCode: 'A4', description: 'ok' }]);
  });
});
