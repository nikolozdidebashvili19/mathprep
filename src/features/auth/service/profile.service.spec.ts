import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/repository/user.repository', () => ({
  userRepository: {
    findById: vi.fn(),
    updateById: vi.fn(),
  },
}));

import { userRepository } from '@/features/auth/repository/user.repository';
import { updateOnboardingService } from '@/features/auth/service/profile.service';

const mockRepo = vi.mocked(userRepository);
const USER_ID = '507f1f77bcf86cd799439011';

describe('updateOnboardingService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when the user does not exist', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);
    const result = await updateOnboardingService(USER_ID, { grade: 11 });
    expect(result).toEqual({ data: { error: 'NOT_FOUND' }, status: 404 });
    expect(mockRepo.updateById).not.toHaveBeenCalled();
  });

  it('saves grade and target score', async () => {
    mockRepo.findById.mockResolvedValueOnce({ _id: USER_ID } as never);
    mockRepo.updateById.mockResolvedValueOnce(true);
    const result = await updateOnboardingService(USER_ID, { grade: 12, targetScore: 40 });
    expect(mockRepo.updateById).toHaveBeenCalledWith(USER_ID, { grade: 12, targetScore: 40 });
    expect(result).toEqual({ data: { grade: 12, targetScore: 40 }, status: 200 });
  });

  it('returns 404 when the update matches nothing', async () => {
    mockRepo.findById.mockResolvedValueOnce({ _id: USER_ID } as never);
    mockRepo.updateById.mockResolvedValueOnce(false);
    const result = await updateOnboardingService(USER_ID, { grade: 11 });
    expect(result.status).toBe(404);
  });
});
