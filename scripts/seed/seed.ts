/**
 * T-010: content/ → MongoDB. Idempotent: upserts skills, exams and questions by `code`.
 * Usage: npm run seed            (needs MONGO_URI in .env; MONGO_DNS_SERVERS if SRV lookups fail)
 * Questions are inserted as `draft`; re-running never overwrites text/options/answer/status edited in review.
 * Skill tags from content/tags/ (T-009) are applied to `draft` questions on every run.
 * `npm run seed -- --refresh-drafts` also pushes text/options/answer/images from content/ onto questions still in
 * `draft` (after fixing extraction output); approved questions are never touched.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { examRepository } from '@/features/exam/repository/exam.repository';
import { questionRepository } from '@/features/question/repository/question.repository';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { TheoryCardSchema } from '@/features/skill/validations/theory.validation';
import { mongo } from '@/shared/lib/mongo';

import { mapExam, mapExplanation, mapQuestion, mapSkills, mapTag, type SkillFile } from './seed-mappers';
import { CONTENT_DIR, log, readIndex } from '../extract/content-index';
import { ExplanationSchema } from '../extract/explanation';
import { QuestionImportSchema } from '../extract/question-import';
import { SkillTagSchema } from '../extract/skill-tag';

const refreshDrafts = process.argv.includes('--refresh-drafts');
const NO_EXPLANATION = { solutionSteps: [], commonMistakes: [] };

async function main() {
  const skillFile = JSON.parse(readFileSync(path.join(CONTENT_DIR, 'skills.json'), 'utf8')) as SkillFile;
  for (const skill of mapSkills(skillFile)) await skillRepository.upsertByCode(skill);
  log(`skills: ${skillFile.skills.length} upserted`);

  // Theory cards (T-020): content/theory/<code>.json, original text, drafts until reviewed.
  const theoryDir = path.join(CONTENT_DIR, 'theory');
  const theoryFiles = existsSync(theoryDir) ? readdirSync(theoryDir).filter((f) => f.endsWith('.json')) : [];
  for (const file of theoryFiles) {
    const { code, ...card } = TheoryCardSchema.parse(JSON.parse(readFileSync(path.join(theoryDir, file), 'utf8')));
    await skillRepository.setTheoryCard(code, card);
  }
  log(`theory cards: ${theoryFiles.length} applied`);

  let inserted = 0;
  let updated = 0;
  let refreshed = 0;
  let tagged = 0;
  let explained = 0;
  for (const entry of readIndex()) {
    const examId = await examRepository.upsertByCode(mapExam(entry));
    const file = path.join(CONTENT_DIR, 'questions', `${entry.id}.json`);
    if (!existsSync(file)) {
      log(`${entry.id}: exam upserted, no extracted questions yet`);
      continue;
    }
    const questions = QuestionImportSchema.array().parse(JSON.parse(readFileSync(file, 'utf8')));
    // One batched write per exam (sequential single upserts took >5 min against Atlas).
    const result = await questionRepository.bulkUpsertByCode(
      questions.map((q) => ({ code: q.code, ...mapQuestion(q, examId, entry.year) }))
    );
    inserted += result.inserted;
    updated += result.matched;
    if (refreshDrafts) {
      refreshed += await questionRepository.refreshDraftContentByCode(
        questions.map((q) => {
          const { text, options, answer, images } = mapQuestion(q, examId, entry.year).onInsert;
          return { code: q.code, fields: { text, options, answer, images } };
        })
      );
    }
    const explanationFile = path.join(CONTENT_DIR, 'explanations', `${entry.id}.json`);
    if (existsSync(explanationFile)) {
      const explanations = ExplanationSchema.array().parse(JSON.parse(readFileSync(explanationFile, 'utf8')));
      explained += await questionRepository.refreshDraftContentByCode(
        // Only blind-verified explanations reach students; guided ones wait for admin review (and are cleared here).
        explanations.map((e) => ({ code: e.code, fields: e.method === 'blind' && e.verified ? mapExplanation(e) : NO_EXPLANATION }))
      );
    }
    const tagFile = path.join(CONTENT_DIR, 'tags', `${entry.id}.json`);
    if (existsSync(tagFile)) {
      const tags = SkillTagSchema.array().parse(JSON.parse(readFileSync(tagFile, 'utf8')));
      tagged += await questionRepository.refreshDraftContentByCode(tags.map((t) => ({ code: t.code, fields: mapTag(t) })));
    }
    log(`${entry.id}: exam + ${questions.length} questions`);
  }

  log(`questions: ${inserted} inserted, ${updated} refreshed (source fields only)`);
  log(`skill tags (T-009) applied to ${tagged} draft questions`);
  log(`explanations (blind-verified shown, guided held for review) applied to ${explained} draft questions`);
  if (refreshDrafts) log(`--refresh-drafts: content re-applied to ${refreshed} draft questions`);
  const byStatus = await questionRepository.countByStatus();
  log(`in database by status: ${byStatus.map((s) => `${s._id}=${s.count}`).join(', ')}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongo.disconnect());
