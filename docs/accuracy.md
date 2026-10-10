# Accuracy

Rule findings for 14 fixtures compared to their expected files, run through `runRules`
with `createSupabaseLookups` against the real reference database.

A finding counts as a true positive only when rule ID, line item IDs and amount at stake all match
an expected finding. Anything else found is a false positive; any expected finding not found is a
false negative. Precision and recall are `n/a` where the denominator is zero.

| Rule | TP | FP | FN | Precision | Recall |
|---|---:|---:|---:|---:|---:|
| duplicate_charge | 1 | 0 | 0 | 100.0% | 100.0% |
| math_error | 1 | 0 | 0 | 100.0% | 100.0% |
| date_mismatch | 1 | 0 | 0 | 100.0% | 100.0% |
| ncci_unbundling | 2 | 0 | 0 | 100.0% | 100.0% |
| mue_exceeded | 1 | 0 | 0 | 100.0% | 100.0% |
| price_outlier | 1 | 0 | 0 | 100.0% | 100.0% |
| vague_charge | 1 | 0 | 0 | 100.0% | 100.0% |
| denied_billed_in_full | 1 | 0 | 0 | 100.0% | 100.0% |
| **overall** | 9 | 0 | 0 | 100.0% | 100.0% |

## Mismatches

None.

## Method

- Fixtures are synthetic bills, not real patient data, and were written alongside the rules, so
  these numbers measure agreement with our own expectations, not real-world accuracy.
- NCCI edits: practitioner PTP edits only (no hospital/outpatient edit set).
- Pricing and MUE checks cover services on the Medicare Physician Fee Schedule only.
- Locality: Los Angeles (LA) only.

Regenerate with `npm run accuracy` (needs `.env.local`).
