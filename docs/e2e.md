# Browser smoke test

One Playwright test covers the signed-out demo flow: landing, **Try a sample bill**, verifying the flagged rows, the report with its findings, the letter preview, and the financial assistance result. It uses only the bundled synthetic sample bill: no sign-in, no uploads, no database and no Anthropic calls.

It is separate from `npm test` (Vitest) and is not run by it.

## Run

```bash
npm install
npx playwright install chromium   # first time only
npm run test:e2e
```

By default Playwright starts `next dev` on port 3100 (or reuses a server already running there). To point at a server you started yourself, for example `npm run build && npm run start`:

```bash
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

## Safety

`playwright.config.ts` refuses any `E2E_BASE_URL` that is not `localhost` or `127.0.0.1`, so it cannot be run against production by accident. The test never signs in.

## Notes

- Selectors use the English UI text; the browser locale is fixed to `en-US`. If you change those strings in `messages/en.json`, update `e2e/demo-flow.e2e.ts`.
- The test expects the sample bill to have 7 rows, 3 flagged and 2 findings.
- Output goes to `test-results/`, which is git-ignored.
