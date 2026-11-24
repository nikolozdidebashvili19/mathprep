import { userRepository } from '@/features/auth/repository/user.repository';
import { OnboardingType } from '@/features/auth/validations/auth.validation';
import { ServiceResult } from '@/shared/types/common';

export async function updateOnboardingService(
  userId: string,
  input: OnboardingType
): Promise<ServiceResult<OnboardingType>> {
  const user = await userRepository.findById(userId);
  if (!user) return { data: { error: 'NOT_FOUND' }, status: 404 };

  const updated = await userRepository.updateById(userId, {
    grade: input.grade,
    targetScore: input.targetScore,
  });
  if (!updated) return { data: { error: 'NOT_FOUND' }, status: 404 };

  return { data: { grade: input.grade, targetScore: input.targetScore }, status: 200 };
}
