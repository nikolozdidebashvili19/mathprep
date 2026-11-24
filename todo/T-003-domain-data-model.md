# T-003 · Domain data model (Mongoose)

**Epic:** Foundation · **Week:** 1 · **Status:** done · **Depends on:** —

## Goal
Implement the PRODUCT §6 data model using the repository's stack (MongoDB + Mongoose, feature folders). PRODUCT.md specifies PostgreSQL + Prisma; see "Decisions" in the README.

## Mapping
| PRODUCT §6 | Here |
|---|---|
| User(grade, target_score, locale) | `auth/schema/user.schema.ts`: adds `grade`, `targetScore`, `locale` |
| Exam | `exam/schema/exam.schema.ts` |
| Skill + SkillPrereq | `skill/schema/skill.schema.ts` (prerequisites embedded as codes) |
| Question + QuestionSkill | `question/schema/question.schema.ts` (skills embedded, `isPrimary`) |
| Template | `question/schema/template.schema.ts` |
| Attempt | `attempt/schema/attempt.schema.ts` |
| Mastery | `mastery/schema/mastery.schema.ts` (unique on user + skill) |
| Course, CourseDay, WeeklyCheck | `course/schema/*.schema.ts` |

## Acceptance criteria
- [x] All schemas follow the CLAUDE.md §4 pattern (`InferSchemaType & { _id }`)
- [x] Shared enums (question type, mistake type, stage, status) live in `src/shared/const/domain.const.ts`
- [x] lint + build + tests pass
- [ ] Repositories are added per feature as each ticket needs them (no speculative repositories)
