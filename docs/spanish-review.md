# Spanish (es) native-speaker review

Everything below is in `messages/es.json` unless noted. The Spanish copy was not written or checked by a native speaker, so each item needs a pass before we claim full Spanish support. Key counts are leaf strings as of this writing.

How to review: read the namespace in context (run the app with the `es` locale), fix wording in `messages/es.json`, and keep the key set identical to `messages/en.json`. Do not change amounts, codes or legal citations. Tick the box and note the reviewer and date when a section is done.

Reviewer: ____________  Date: ____________

## Key terms to check

Confirm each term reads naturally to Spanish-speaking patients in the US and is used the same way everywhere. Search `messages/es.json` for every occurrence, not just the first.

- [ ] **"Estimación de Buena Fe"** (Good Faith Estimate; about 18 occurrences). Check capitalization, and whether "estimación de buena fe" is the right term versus how providers and CMS Spanish materials phrase it.
- [ ] **"facturación del saldo"** (balance billing; 2 occurrences). Check against CMS/No Surprises Act Spanish wording, and that it is explained, not just named.
- [ ] **"monto permitido"** (allowed amount; 2 occurrences). Check it matches the term on Spanish EOBs and insurer materials.
- [ ] **"posible desglose indebido"** (possible unbundling; 1 occurrence). Check that it is understandable without implying fraud, and that "possible" hedging survives.

## Namespaces and files

| Done | Namespace / file | Keys | Notes |
|---|---|---|---|
| [ ] | `Checklist` | 22 | Printable checklist; check imperative tone |
| [ ] | `Report.timeline` | 19 | Nested under `Report`; dates and sequencing words |
| [ ] | `Demo.walkthrough` | 13 | Nested under `Demo`; the sample-bill tour |
| [ ] | `FAQ` | 56 | Includes groups, sources, related; legal accuracy matters |
| [ ] | `Share` | 14 | Share page, QR copy |
| [ ] | `CallScript` | 29 | Read aloud on the phone; must sound spoken, not written |
| [ ] | `Reminders` | 15 | Follow-up and GFE reminder text |
| [ ] | `Rights` | 41 | Patient-rights guides; legal accuracy matters |
| [ ] | `RightsCheck` | 5 | |
| [ ] | `Glossary` | 39 | Term names and definitions; check each term is the one patients see |
| [ ] | `Methodology` | 68 | Rule descriptions; keep "possible" hedging |
| [ ] | `Shell` | 33 | Header, footer, language switcher, privacy promise |
| [ ] | `Meta` | 46 | Page titles and descriptions; mind length for search results |
| [ ] | `Letter.doc` (dispute and itemized-bill letters) | in `Letter` (79) | Sent to providers; formal register (usted), also the PDF in `src/app/bills/[id]/letter/` |
| [ ] | `Letter.page` | in `Letter` (79) | Editor UI around the letter |
| [ ] | `/about` (`About`, 75) | 75 | `src/app/about/page.tsx`; also pulls from `Home` and `Privacy` |
| [ ] | `/privacy` (`Privacy`, 36) | 36 | Must match the upload card and footer; review with legal-verification |
| [ ] | `/terms` (`Terms`, 19) | 19 | Legal register |
| [ ] | `/help` (`Help`, 21) | 21 | `src/app/help/page.tsx` |

## Review notes

- Letters: confirm the register is formal and consistent, that placeholders and amounts render correctly in the PDF, and that accented characters are not dropped by the PDF font.
- Privacy and terms: wording must say the same true things as the upload card and footer; see `docs/legal-verification.md`.
- Findings text: explanations keep amounts and codes unchanged; only the surrounding prose is under review.
- Not in this list but in `es.json`: `Home`, `Dashboard`, `Review`, `Report` (other than `timeline`), `Assistance`, `Upload`, `DeleteBill`, `Manual`, `Settings`, `Explain`, `Error`, `NotFound`, `AuthError`. Schedule a second pass for these.
