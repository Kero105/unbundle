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
      // The old "Understanding costs in advance" URL now redirects here (checked
      // 2026-10-13), so the link is titled for the page it really opens.
      key: "cmsCosts",
      href: "https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights",
    },
  ],
  itemized: [{ key: "statute", href: "https://www.law.cornell.edu/uscode/text/42/1395b-7" }],
} as const;

export const RIGHTS_STEPS = {
  assistance: ["ask", "apply", "hold", "estimate"],
  gfe: ["compare", "date", "tool", "start"],
  itemized: ["writing", "detail", "notes", "letter"],
} as const;
