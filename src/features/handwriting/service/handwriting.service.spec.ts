import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/handwriting/repository/work-photo.repository', () => ({
  workPhotoRepository: { findImageById: vi.fn(), setAnalysis: vi.fn() },
}));
vi.mock('@/shared/lib/ai-vision', () => ({
  aiVision: { generateJson: vi.fn(), describe: () => ({ provider: 'gemini', model: 'test-model' }) },
}));

import { workPhotoRepository } from '@/features/handwriting/repository/work-photo.repository';
import {
  AnalysisContext,
  analyzeWorkPhotoService,
  buildAnalysisPrompt,
  getOwnWorkPhotoImageService,
} from '@/features/handwriting/service/handwriting.service';
import { aiVision } from '@/shared/lib/ai-vision';

const repo = vi.mocked(workPhotoRepository);
const model = vi.mocked(aiVision);

const context: AnalysisContext = {
  question: { text: 'ამოხსენით $x^2=4$', options: [{ key: 'ა', text: '$2$' }, { key: 'ბ', text: '$\\pm 2$' }], answer: 'ბ' },
  studentAnswer: 'ა',
  correct: false,
  skills: [
    { code: 'A7', nameKa: 'კვადრატული განტოლებები', nameEn: 'Quadratic equations' },
    { code: 'N6', nameKa: 'ფესვები', nameEn: 'Roots' },
  ],
};

const PHOTO_ID = new Types.ObjectId().toString();
const OWNER = new Types.ObjectId().toString();
const storedPhoto = { userId: OWNER, mimeType: 'image/jpeg', data: Buffer.from('jpeg-bytes') };

describe('buildAnalysisPrompt', () => {
  it('includes the question, both answers, the verdict and only the allowed skills', () => {
    const prompt = buildAnalysisPrompt(context);
    expect(prompt).toContain('ამოხსენით $x^2=4$');
    expect(prompt).toContain('Correct answer: ბ');
    expect(prompt).toContain("Student's answer: ა (wrong)");
    expect(prompt).toContain('A7: Quadratic equations (კვადრატული განტოლებები)');
    expect(prompt).toContain('N6: Roots');
  });
});

describe('analyzeWorkPhotoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.findImageById.mockResolvedValue(storedPhoto);
  });

  it('sends the photo and stores the analysis, dropping skill codes outside the allowed list', async () => {
    model.generateJson.mockResolvedValue(
      JSON.stringify({
        readable: true,
        matchesQuestion: true,
        workShown: true,
        approach: 'ფესვი ამოიღო',
        mistakes: [
          { type: 'conceptual', skillCode: 'N6', description: 'უარყოფითი ფესვი დაკარგა' },
          { type: 'calculation', skillCode: 'Z9', description: 'უცნობი' },
        ],
        skillsShown: ['A7', 'Q1'],
        feedback: 'გაიხსენე, რომ ფესვს ორი ნიშანი აქვს.',
      })
    );

    const res = await analyzeWorkPhotoService(PHOTO_ID, context);

    expect(res.data).toEqual({ status: 'done' });
    expect(model.generateJson.mock.calls[0][0].images).toEqual([{ mimeType: 'image/jpeg', base64: Buffer.from('jpeg-bytes').toString('base64') }]);
    const saved = repo.setAnalysis.mock.calls[0][1];
    expect(saved).toMatchObject({
      status: 'done',
      mistakes: [{ type: 'conceptual', skillCode: 'N6', description: 'უარყოფითი ფესვი დაკარგა' }],
      skillsShown: ['A7'],
      provider: 'gemini',
      model: 'test-model',
    });
  });

  it('ignores mistakes on an unreadable photo', async () => {
    model.generateJson.mockResolvedValue(
      JSON.stringify({ readable: false, matchesQuestion: false, workShown: false, mistakes: [{ type: 'conceptual', skillCode: 'N6', description: 'x' }] })
    );
    await analyzeWorkPhotoService(PHOTO_ID, context);
    expect(repo.setAnalysis.mock.calls[0][1]).toMatchObject({ status: 'done', readable: false, mistakes: [] });
  });

  it('stores a failure instead of throwing when the model call fails', async () => {
    model.generateJson.mockRejectedValue(new Error('Gemini 429: quota'));
    const res = await analyzeWorkPhotoService(PHOTO_ID, context);
    expect(res.data).toEqual({ status: 'failed' });
    expect(repo.setAnalysis.mock.calls[0][1]).toMatchObject({ status: 'failed', error: 'Gemini 429: quota' });
  });
});

describe('getOwnWorkPhotoImageService', () => {
  it('returns the image to its owner only', async () => {
    repo.findImageById.mockResolvedValue(storedPhoto);
    expect((await getOwnWorkPhotoImageService(OWNER, PHOTO_ID)).status).toBe(200);
    expect((await getOwnWorkPhotoImageService(new Types.ObjectId().toString(), PHOTO_ID)).data).toEqual({ error: 'NOT_FOUND' });
  });
});
