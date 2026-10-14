# AI use notes (draft, edit before submission)

## What I decided and directed
- The idea: Unbundle, a medical bill auditor for people who get confusing bills.
- The design rule: AI never decides whether a charge is wrong. AI only reads an uploaded bill into structured data. A deterministic, tested rules engine using public CMS data (NCCI, MUE, Medicare Physician Fee Schedule) produces every finding.
- Privacy rules: no keys in chat or code, no bill contents in logs, no real bills in the repo or the demo video, no phone numbers or text messages.
- Sourcing rule: every legal or financial claim needs a source link and a not-legal-advice note; claims I couldn't confirm were cut or left out.
- Scope decisions: what pages and features to build, the four-link nav, manual bill entry, which features to defer.
- Model choice for bill reading: Claude Haiku 5.5. I chose it after running a 38-image synthetic test (37 images had no line-item mismatches, 1 had a mismatch) and considering cost. I did not run a full Sonnet comparison.

## What AI tools did
- Claude Code (Anthropic) wrote most of the code, tests, and first drafts of page and letter copy, from prompts I gave it.
- Claude (chat) helped me plan, break the work into steps, and write the prompts I gave Claude Code, and reviewed its reports.
- At runtime, an Anthropic model reads an uploaded bill into structured data. Separately, it gives short general definitions of billing codes (only the billing code is sent, not the line description). Fixed, tested rules decide every finding.

## What I did myself
- Reviewed each report, tested features in the browser, and caught bugs (the signed-in hero button showing "Sign in with Google", and the Next.js error overlay on the review page).
- Read sources myself: the HCAI Hospital Fair Billing Program page (found the AB 1020 350% to 400% FPL sentence and the January 1, 2024 date), and the uqr package license (MIT).
- Applied the database migrations in Supabase, and set up Vercel and the environment variables.
- Hand-written work: none yet.
- User testing: not yet done.

## What is not done or not verified
- Spanish text has not been reviewed by a native speaker.
- Real-photo accuracy of bill reading: tested only on 38 synthetic images; not yet tested on real bills.
