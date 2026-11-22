import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export type LoginType = z.infer<typeof LoginSchema>;

export const SignUpSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export type SignUpType = z.infer<typeof SignUpSchema>;

export const OnboardingSchema = z.object({
  grade: z.union([z.literal(11), z.literal(12)]),
  targetScore: z.number().int().min(1).max(100).optional(),
});

export type OnboardingType = z.infer<typeof OnboardingSchema>;
