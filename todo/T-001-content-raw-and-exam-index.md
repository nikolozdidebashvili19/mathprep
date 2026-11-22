# T-001 · Content folder, raw PDFs, exam index

**Epic:** Foundation · **Week:** 1 · **Status:** done · **Depends on:** —

## Goal
Get the NAEC source PDFs into the project (never public, never committed) and produce a machine-readable index of every exam.

## Findings (differs from PRODUCT.md §8)
- The source is **not one combined PDF**. It is 24 files in `ეროვნულები/<year>/`: one exam booklet plus one `-pasukhebi` (answers) file per year. 2015 has two variants, each a single file with exam and answers together.
- **The Georgian text has no Unicode layer.** `pdftotext` returns only Latin letters, digits and punctuation, so the Georgian question text is lost. Extraction must be **vision/OCR on rendered pages** (see T-007). Plain text extraction is still useful for finding question numbers and points, for example `(1) 1.`.
- 2016–2019 file names carry no variant. They are treated as variant 1 (**unverified**).

## Acceptance criteria
- [x] `content/raw/<year>/*.pdf` holds copies of all 24 source PDFs
- [x] `content/raw/` is in `.gitignore` (exam-rights risk, PRODUCT §11)
- [x] `content/index.json` lists every exam: id, year, variant, exam file, answer-key file, page counts
- [ ] Per-question page numbers are filled in by T-006
