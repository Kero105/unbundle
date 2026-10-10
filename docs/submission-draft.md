# Submission draft

Fill in the placeholders in `[BRACKETS]`, then trim each section to the word limit. Word counts below are rough drafts, not final.

## App description (limit: [WORD LIMIT])

Unbundle audits medical bills. A person uploads a photo or PDF of a bill, and Unbundle reads it into line items, lets them correct anything it misread, and checks every line against public Medicare rules: duplicate charges, math errors, wrong dates, procedures billed separately that should be billed together, quantities above Medicare's limits, prices far above the Medicare rate, vague lump-sum charges, and denied claims billed in full. They get a plain-language report in English or Spanish and a dispute letter, ready to download as a PDF, that asks the billing office only about the items the checks flagged. An optional step estimates whether they may qualify for free or discounted care at a California hospital and compares a Good Faith Estimate with the final bill.

[PERSONAL STORY LINE: one or two sentences in your own words about why you built this.]

Try it without signing in: [DEMO LINK].

## How it uses technology (limit: [WORD LIMIT])

The main design decision is that the AI never decides what is wrong. Claude is used for two jobs only: reading a bill into a structured, schema-validated set of line items, and rewriting an existing finding in plain words. Every finding comes from deterministic TypeScript rules with unit tests, run against public CMS data (NCCI 2026 Q4 edits, RVU26A fee schedule, HHS 2026 poverty guidelines) stored in Postgres. The same bill always produces the same findings, and the AI cannot add, remove or change a finding or its dollar amount.

Every external boundary is validated with Zod, so a malformed extraction is rejected or flagged rather than guessed at. The person reviews and corrects the extracted rows before any check runs. Money is stored as integer cents everywhere.

The stack is Next.js and TypeScript with Supabase for Google sign-in, Postgres and storage. Row-level security is enabled on every table and bucket, so each person can only ever read their own bills. Images are resized in the browser before upload, which also strips location metadata. The interface and the PDF letter are fully bilingual through next-intl, and the report and letter are generated with `@react-pdf/renderer`.

I measured the rules against 14 synthetic fixture bills, including five designed to trigger false alarms, and publish the results, with the caveat that these are my own test cases and not real-world accuracy.

## Community impact (limit: [WORD LIMIT])

Medical billing errors are hard for a patient to spot and expensive to ignore, and the people with the least time, money and English fluency are the least able to challenge them. Unbundle gives anyone a free, private first check and, just as important, the words to ask a billing office a polite, specific question.

It is built to be honest about what it is. Findings are "worth asking about", not accusations. The About page lists what it cannot do: practitioner edits only, Physician Fee Schedule services only, Los Angeles pricing only. It is not legal or medical advice.

It is aimed at families who are uninsured or underinsured and Spanish-speaking households, who are most often left to pay a bill they cannot verify. [OPTIONAL: your local community, who you tested it with, any feedback you received.]

## What I learned (limit: [WORD LIMIT])

- Where to put the AI. The most useful decision was a negative one: refuse to let the model judge the bill. That made the system testable and explainable.
- Domain rules are full of exceptions: modifier 59 and 25 bypass some edits, a quantity exactly at the limit is not an error, a price exactly 4x Medicare is not an outlier. The trap fixtures exist because the obvious version of each rule produced false alarms.
- Privacy is a feature you have to build into the plumbing: no bill text in logs, per-user policies on every table, secrets kept server-side, and copy that says only what is true.
- Accessibility and translation are easier to do from the start than to bolt on, and a "formal usted" Spanish version needs to be a first-class piece of work, not a machine pass.
- Being honest about accuracy numbers is harder than producing them. [YOUR OWN REFLECTION HERE.]

## Checklist before submitting

- [ ] Demo link works signed out, in both languages.
- [ ] Production `EXTRACTION_MODE=anthropic` confirmed (see `docs/DEPLOY.md`).
- [ ] Privacy wording matches `/privacy`.
- [ ] No personal data in the repository or the video.
