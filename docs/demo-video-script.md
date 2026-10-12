# Demo video script (about 2:40, target 2:30)

Record in a clean browser window at 1280×800, signed out, on the production or staging URL with the sample bill. Start in English. The sample bill is made up, so nothing on screen is personal data. Times are targets.

| Time | Screen action | Voiceover |
|---|---|---|
| 0:00–0:15 | Landing page, hero visible. | **[PERSONAL STORY LINE: one or two sentences in your own words.]** |
| 0:15–0:30 | Slowly scroll the "What we check" cards. | "Medical bills are hard to read and harder to check. Unbundle checks a bill against public Medicare rules and tells you what is worth asking about." |
| 0:30–0:40 | Scroll up. Click **Try a sample bill**, then **Start the sample**. | "You do not need an account to try it. This sample bill is made up." |
| 0:40–1:05 | Review page. Pause on "We read 7 rows from your bill." Point at the three marked rows (rows 2, 6 and 7, "Check this"). | "First, the AI reads the bill into rows. It only reads. Rows it was unsure of are marked, and I stay in control: I check each one against my bill." |
| 1:05–1:20 | Tick **Mark row 2 as verified**, then rows 6 and 7. Click **Looks right, continue**. | "Once I have checked the marked rows, I continue." |
| 1:20–1:50 | Report page. Pause on "Total at stake" and the two findings (price outlier, vague charge). Open **Why we flagged this** on one finding. | "Now the checks run. These are fixed, tested rules on public data. The AI does not decide what is wrong, so the same bill always gives the same result. Each finding shows the rule behind it and the amount." |
| 1:50–2:05 | Click **Create a dispute letter**. Scroll the live preview. Click the **Español** letter toggle, then back. **Show Spanish here.** | "The letter asks only about what was flagged, in a polite tone. It is available in English and Spanish." |
| 2:05–2:15 | Back to report, click **Check financial assistance**. Enter household size 3, income 30,000, choose "Yes, I have insurance", click **See my estimate**. | "An optional step estimates whether I may qualify for financial help at a California hospital." |
| 2:15–2:25 | Click the **ES** language toggle in the header. **Show the interface in Spanish here.** Then go to **About** and show the accuracy table. | "The whole app works in Spanish." |
| 2:25–2:40 | About page: the accuracy table, then "Scope and limits". | "I tested every rule against 16 synthetic bills, and all of them passed. But I wrote those tests myself, so this shows the rules work as designed, not that they catch every real error. It covers practitioner edits, Physician Fee Schedule services and Los Angeles prices only. Findings are things worth asking about, not certain mistakes. This is Unbundle." |

## Notes

- If the run goes over 2:30, cut the assistance step first and read the closing lines faster.
- The Spanish toggle is in the header (EN | ES). Show it at 2:15; the letter language toggle is separate and sits above the letter fields.
- Keep the cursor visible and slow. Do not show `.env` files, the Supabase dashboard or any real bill.
- Do the take against production only for signed-out demo pages. Do not sign in on camera.
- Verify before recording that the sample still shows 7 rows, 3 marked and 2 findings; if the sample data changes, update the numbers in this script.
