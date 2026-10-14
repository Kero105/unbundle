# Legal threshold verification

Checked 2026-10-10 using WebFetch on official pages (plus one web search to locate the CMS page). Paraphrased; see sources for exact text. Nothing is marked confirmed from memory.

| # | Claim in Unbundle | Source | Status | Notes |
|---|---|---|---|---|
| 1 | California financial assistance income ceiling is 400% of the federal poverty level (AB 1020, effective 2024; previously 350%) | https://hcai.ca.gov/affordability/hospital-fair-billing-program/laws-and-regulations/ | **confirmed** | HCAI states AB 1020 raised the level from 350% to 400% FPL, effective 2024-01-01. Statute reference: Health & Safety Code 127400 et seq. |
| 2 | At or below 200% FPL: free care; 200-400%: discounted payment | HCAI laws page (above); HCAI program page https://hcai.ca.gov/affordability/hospital-fair-billing-program/ | **could not verify** | HCAI's pages do not state the 200%/400% split. The statute pages (leginfo.legislature.ca.gov, Justia) returned HTTP 403. Code keeps 200% as an estimate boundary; user copy no longer asserts it. |
| 3 | Applies to uninsured patients or patients with high medical costs | HCAI laws page; HCAI program page | **could not verify** | Neither page states who qualifies. A secondary source (not official, not relied on) describes uninsured or high-medical-cost patients at or below 400% FPL. Each hospital's published policy governs. |
| 4 | Assets are not considered for eligibility | HCAI laws page | **confirmed** (not used in code) | AB 2297 / SB 1061, effective 2025-01-01, eliminate consideration of monetary assets. |
| 5 | Federal patient-provider dispute: billed charges at least $400 above the Good Faith Estimate | https://www.cms.gov/medical-bill-rights/help/dispute-a-bill ; https://www.cms.gov/nosurprises/consumers/understanding-costs-in-advance | **confirmed** | Code uses >= $400 (40000 cents). |
| 6 | Dispute must be started within 120 calendar days, counted from the initial bill | https://www.cms.gov/medical-bill-rights/help/dispute-a-bill | **confirmed** | CMS says the initial bill must be dated within the last 120 calendar days. Code measures from bill date to today. |
| 7 | Applies to uninsured or self-pay individuals | CMS dispute page (above) | **confirmed** | Also requires that the person told the provider they were uninsured / not using insurance, and received a Good Faith Estimate. Fee: $25 non-refundable administrative fee. |
| 8 | Medicare beneficiaries can ask in writing for an itemized statement; it must be furnished within 30 days; knowing failure carries a civil money penalty of up to $100 | 42 U.S.C. 1395b-7(b) (Social Security Act 1806(b)), text read at https://www.law.cornell.edu/uscode/text/42/1395b-7 | **confirmed from statute text, republisher** | Official hosts (uscode.house.gov, ssa.gov) were not retrievable in this session (404, 403), so the text was read on Cornell LII. Applies to Medicare items and services only. No official page was found that sets an itemized-bill right for private-insurance or self-pay patients, so /rights makes no such claim. California statute pages were not retrievable either. |

## Changes made

- No thresholds changed (no official page said they differ).
- User-facing copy (`Assistance.fpl.*`, en and es) no longer claims "many hospitals offer free care/discounts at this level"; it now says only that California law lets people at or below 400% FPL apply and that the hospital's policy decides free vs discounted.
- Code comments in `src/lib/assistance` now cite sources and drop "verify before launch" where confirmed.

## Open items

- Verify row 2 and 3 against the statute text (HSC 127405) in a browser; automated fetch was blocked.
- Consider adding to GFE copy that the person must have told the provider they were uninsured and that a $25 fee applies.
