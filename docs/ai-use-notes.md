# AI use notes (draft, edit before submission)

## What I decided and directed
- The idea: Unbundle, a medical bill auditor for people who get confusing bills.
- The design rule: AI never decides whether a charge is wrong. AI only reads an uploaded bill into structured data. A deterministic, tested rules engine using public CMS data (NCCI, MUE, Medicare Physician Fee Schedule) produces every finding.
- Privacy rules: no keys in chat or code, no bill contents in logs, no real bills in the repo or the demo video, no phone numbers or text messages.
- Sourcing rule: every legal or financial claim needs a source link and a not-legal-advice note; claims I couldn't confirm were cut or left out.
- Scope decisions: what pages and features to build, the four-link nav, manual bill entry, which features to defer.
- Model choice for bill reading: [CONFIRM final choice after the accuracy comparison].

## What AI tools did
- Claude Code (Anthropic) wrote most of the code, tests, and first drafts of page and letter copy, from prompts I gave it.
- Claude (chat) helped me plan, break the work into steps, and write the prompts I gave Claude Code, and reviewed its reports.
- At runtime, an Anthropic model reads uploaded bills into data and gives short general definitions of billing codes. [CONFIRM final wording]

## What I did myself
- Reviewed each report, tested features in the browser, and caught bugs (for example the signed-in hero button and the Next.js error overlay) [CONFIRM and add others].
- Read sources myself: [CONFIRM which: HCAI page, package license, others].
- Applied the migrations in Supabase, set up Vercel and environment variables, and rotated leaked keys [CONFIRM].
- [ADD: what I coded or wrote by hand, if anything]
- [ADD: user testing with 2-3 people and what I changed]

## What is not done or not verified
- Spanish text has not been reviewed by a native speaker.
- Real-photo accuracy of bill reading [CONFIRM status after the eval].
