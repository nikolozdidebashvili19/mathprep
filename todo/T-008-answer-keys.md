# T-008 · Answer keys and marking criteria

**Epic:** Content pipeline · **Week:** 2 · **Status:** in progress (keys done; criteria wait for T-007) · **Depends on:** T-006

## Done
- [x] `content/answer-keys/<exam-id>.json` for all 13 exams: **every multiple-choice answer** (ა/ბ/გ/დ), the list of written questions, and `final` answers in LaTeX where a page shows them (complete for 2015-V1, 2015-V2, 2016, 2018; partial for 2017, 2019, 2020)
- [x] Transcribed by hand from the rendered answer tables (`content/raw/pages/<id>/answers/…`; for 2015 the table is on the exam's last page). Each string was re-checked against its table, which caught and fixed one typo (2018, questions 24–30)
- [x] `scripts/extract/answer-key.ts`: Zod schema + `checkAnswerKey`. The spec validates every real key file: numbering runs 1..N, it covers every question, and final answers appear only on written questions
- [x] Cross-check: for 2020–2026 the MC questions are exactly the 1-point questions the T-006 locator found in the exam PDFs

| Exams | MC | Written |
|---|---|---|
| 2023–2026 | 1–37 | 38–41 |
| 2021, 2022 | 1–27 | 28–35 |
| 2015–2020 | 1–30 | 31–40 |

## Still to do
- [ ] Marking criteria + solution steps for written questions (the remaining answer pages): needs the vision pipeline (T-007, `ANTHROPIC_API_KEY`)
- [ ] Final answers for the remaining written questions (2017, 2019–2026), from the same pages
- [ ] Merge into `content/questions/<exam-id>.json` once T-007 produces it
- [ ] Set `verified: true` after a second reader confirms (spot-check with the T-011 admin review)
