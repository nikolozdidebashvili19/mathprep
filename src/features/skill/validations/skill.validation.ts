import { z } from 'zod';

import { findPrerequisiteCycle } from '@/features/skill/service/skill-graph.service';

const SKILL_CODE_PATTERN = /^[A-Z][0-9]{1,2}$/;

export const SkillTopicSchema = z.object({
  code: z.string().regex(/^[A-Z]$/),
  nameKa: z.string().min(1),
  nameEn: z.string().min(1),
});

export type SkillTopicType = z.infer<typeof SkillTopicSchema>;

export const SkillDefinitionSchema = z.object({
  code: z.string().regex(SKILL_CODE_PATTERN),
  topic: z.string().regex(/^[A-Z]$/),
  nameKa: z.string().min(1),
  nameEn: z.string().min(1),
  examWeight: z.number().positive(),
  minPracticeMinutes: z.number().int().positive(),
  prerequisites: z.array(z.string().regex(SKILL_CODE_PATTERN)),
});

export type SkillDefinitionType = z.infer<typeof SkillDefinitionSchema>;

export const SkillGraphSchema = z
  .object({
    version: z.number().int().positive(),
    weightSource: z.enum(['estimate', 'exams']),
    topics: z.array(SkillTopicSchema).min(1),
    skills: z.array(SkillDefinitionSchema).min(1),
  })
  .superRefine((graph, ctx) => {
    const topicCodes = new Set(graph.topics.map((t) => t.code));
    const skillCodes = new Set<string>();

    graph.skills.forEach((skill, i) => {
      if (skillCodes.has(skill.code)) {
        ctx.addIssue({ code: 'custom', path: ['skills', i, 'code'], message: `Duplicate skill ${skill.code}` });
      }
      skillCodes.add(skill.code);
      if (!topicCodes.has(skill.topic)) {
        ctx.addIssue({ code: 'custom', path: ['skills', i, 'topic'], message: `Unknown topic ${skill.topic}` });
      }
    });

    graph.skills.forEach((skill, i) => {
      skill.prerequisites.forEach((prereq) => {
        if (prereq === skill.code || !skillCodes.has(prereq)) {
          ctx.addIssue({
            code: 'custom',
            path: ['skills', i, 'prerequisites'],
            message: `Invalid prerequisite ${prereq} on ${skill.code}`,
          });
        }
      });
    });

    const cycle = findPrerequisiteCycle(graph.skills);
    if (cycle) {
      ctx.addIssue({ code: 'custom', path: ['skills'], message: `Prerequisite cycle: ${cycle.join(' → ')}` });
    }
  });

export type SkillGraphType = z.infer<typeof SkillGraphSchema>;
