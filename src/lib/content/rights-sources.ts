/**
 * Every legal or financial claim on /rights links to one of these. The
 * assistance and Good Faith Estimate pages were checked on 2026-10-10
 * (docs/legal-verification.md); the statute on 2026-10-13. Nothing is cited
 * that has no URL here.
 */
export const RIGHTS_SOURCES = {
  assistance: [
    { key: "hcaiProgram", href: "https://hcai.ca.gov/affordability/hospital-fair-billing-program/" },
    {
      key: "hcaiLaws",
      href: "https://hcai.ca.gov/affordability/hospital-fair-billing-program/laws-and-regulations/",
    },
  ],
  gfe: [
    { key: "cmsDispute", href: "https://www.cms.gov/medical-bill-rights/help/dispute-a-bill" },
    {
      key: "cmsCosts",
      href: "https://www.cms.gov/nosurprises/consumers/understanding-costs-in-advance",
    },
  ],
  itemized: [{ key: "statute", href: "https://www.law.cornell.edu/uscode/text/42/1395b-7" }],
} as const;

export const RIGHTS_STEPS = {
  assistance: ["ask", "apply", "hold", "estimate"],
  gfe: ["compare", "date", "tool", "start"],
  itemized: ["writing", "detail", "notes", "letter"],
} as const;
