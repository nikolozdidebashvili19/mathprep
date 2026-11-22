/**
 * T-009 / T-002: recompute examWeight in content/skills.json from the tagged real exams (content/tags/).
 * examWeight = expected points per skill on a recency-weighted average paper (see computeExamWeights).
 * Usage: npm run content:weights   (then npm run seed to push the new weights)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_DIR, log, readIndex } from './content-index.ts';
import { QuestionImportSchema } from './question-import.ts';
import { computeExamWeights, SkillTagSchema, type WeightInput } from './skill-tag.ts';

type SkillFileJson = { version: number; weightSource: string; skills: { code: string; examWeight: number; nameEn: string }[] };

const skillsPath = path.join(CONTENT_DIR, 'skills.json');
const skillFile: SkillFileJson = JSON.parse(readFileSync(skillsPath, 'utf8'));

const items: WeightInput[] = [];
let untagged = 0;
for (const exam of readIndex()) {
  const qFile = path.join(CONTENT_DIR, 'questions', `${exam.id}.json`);
  const tFile = path.join(CONTENT_DIR, 'tags', `${exam.id}.json`);
  if (!existsSync(qFile)) continue;
  const questions = QuestionImportSchema.array().parse(JSON.parse(readFileSync(qFile, 'utf8')));
  const tags = existsSync(tFile) ? new Map(SkillTagSchema.array().parse(JSON.parse(readFileSync(tFile, 'utf8'))).map((t) => [t.code, t])) : new Map();
  for (const q of questions) {
    const tag = tags.get(q.code);
    if (tag) items.push({ year: exam.year, examId: exam.id, maxPoints: q.maxPoints, tag });
    else untagged++;
  }
}
if (untagged) log(`⚠ ${untagged} questions have no tag yet; run content:tag first for complete weights`);

const weights = computeExamWeights(items, skillFile.skills.map((s) => s.code));
const changes = skillFile.skills.map((s) => ({ ...s, before: s.examWeight, examWeight: weights[s.code] }));
for (const s of [...changes].sort((a, b) => b.examWeight - a.examWeight)) {
  log(`${s.code.padEnd(4)} ${String(s.before).padStart(4)} → ${String(s.examWeight).padStart(5)}  ${s.nameEn}`);
}

skillFile.skills = skillFile.skills.map((s) => ({ ...s, examWeight: weights[s.code] }));
skillFile.weightSource = 'exams';
writeFileSync(skillsPath, `${JSON.stringify(skillFile, null, 2)}\n`);
log(`skills.json updated from ${items.length} tagged questions (weightSource: exams)`);
