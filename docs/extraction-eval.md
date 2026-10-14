# Extraction evaluation

Real extractor run on synthetic fixture images (model `claude-haiku-5-5`, 2026-10-14).
Ground truth is `fixtures/images/manifest.json`. Rows are matched when at least two of code,
date, units and charge agree; a field is correct when it equals the ground truth exactly.
This report lists fixture ids, row numbers and field names only, never bill text.

Images: 38, extraction failed: 0. Rows expected: 184, matched: 184, extra rows: 0.

## Accuracy by field

| Field | Correct | Total | Accuracy |
|---|---:|---:|---:|
| code | 184 | 184 | 100.0% |
| date | 183 | 184 | 99.5% |
| units | 184 | 184 | 100.0% |
| charge | 184 | 184 | 100.0% |

## Accuracy by variant

| Variant | Images | code | date | units | charge |
|---|---:|---:|---:|---:|---:|
| clean | 32 | 100.0% | 100.0% | 100.0% | 100.0% |
| jpeg-artifacts | 1 | 100.0% | 75.0% | 100.0% | 100.0% |
| lowres | 1 | 100.0% | 100.0% | 100.0% | 100.0% |
| phone-photo | 1 | 100.0% | 100.0% | 100.0% | 100.0% |
| rotated | 1 | 100.0% | 100.0% | 100.0% | 100.0% |
| shadow | 1 | 100.0% | 100.0% | 100.0% | 100.0% |
| two-page | 1 | 100.0% | 100.0% | 100.0% | 100.0% |

## Mismatches

- `bill-03-date-outside-range.jpeg-artifacts.jpg` (bill-03-date-outside-range, jpeg-artifacts): row 3: date
