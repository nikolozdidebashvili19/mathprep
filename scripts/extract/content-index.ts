import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { LocatedQuestion, LocatorResult } from './question-locator.ts';

export const CONTENT_DIR = path.resolve(import.meta.dirname, '../../content');
export const RAW_DIR = path.join(CONTENT_DIR, 'raw');
export const PAGES_DIR = path.join(RAW_DIR, 'pages');
const INDEX_PATH = path.join(CONTENT_DIR, 'index.json');

export type ExamIndexEntry = {
  id: string;
  year: number;
  variant: number;
  variantVerified: boolean;
  examFile: string;
  examPageCount: number;
  answerKeyFile: string;
  answerKeyPageCount: number;
  answerKeyInExamFile: boolean;
  locator?: Pick<LocatorResult, 'pattern' | 'status' | 'totalPoints'>;
  questions: LocatedQuestion[];
};

export const readIndex = (): ExamIndexEntry[] => JSON.parse(readFileSync(INDEX_PATH, 'utf8'));

export const writeIndex = (entries: ExamIndexEntry[]) => writeFileSync(INDEX_PATH, `${JSON.stringify(entries, null, 2)}\n`);

/** `--exam 2024-V1` limits a run to one exam; no flag means every exam. */
export const selectExams = (entries: ExamIndexEntry[], argv: string[]): ExamIndexEntry[] => {
  const i = argv.indexOf('--exam');
  if (i === -1) return entries;
  const id = argv[i + 1];
  const match = entries.filter((e) => e.id === id);
  if (match.length === 0) throw new Error(`Unknown exam id: ${id}`);
  return match;
};

export const numberArg = (argv: string[], flag: string, fallback: number): number => {
  const i = argv.indexOf(flag);
  return i === -1 ? fallback : Number(argv[i + 1]);
};

export const log = (line: string) => process.stdout.write(`${line}\n`);
