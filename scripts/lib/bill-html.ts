/**
 * HTML for a fictional hospital bill, used only by scripts/make-bill-images.ts.
 * Every page carries a visible "SAMPLE - FICTIONAL" footer. Providers come from
 * the synthetic fixtures; patients and addresses are invented here.
 */
import type { ExtractedBill, LineItem } from "../../src/lib/types";

export type Layout = "itemized" | "summary" | "twocolumn";

export const FOOTER_TEXT = "SAMPLE - FICTIONAL";

const PATIENTS = [
  "Jordan Q. Sample",
  "Riley Testperson",
  "Casey Placeholder",
  "Morgan Exampleton",
  "Avery Fictional",
  "Taylor Mockwell",
  "Quinn Demoson",
  "Sasha Notreal",
  "Drew Pretend",
  "Robin Specimen",
  "Jamie Faux",
  "Alex Dummyfield",
  "Sam Illustrative",
  "Lee Synthetica",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const money = (cents: number) => {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
};

const usDate = (iso: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

const codeCell = (item: LineItem) =>
  item.code ? `${item.code}${item.modifiers.length ? `-${item.modifiers.join("-")}` : ""}` : "";

const CSS = `
  @page { size: 8.5in 11in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1c1c1c; font-size: 11px; }
  .page { position: relative; width: 8.5in; height: 11in; padding: 0.6in 0.6in 0.9in; overflow: hidden; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f4e79; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 20px; font-weight: 700; color: #1f4e79; }
  .addr { color: #444; line-height: 1.4; margin-top: 4px; }
  .stmt { text-align: right; }
  .stmt h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: 1px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .box { border: 1px solid #999; padding: 8px 10px; }
  .box h3 { margin: 0 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #e8eef5; text-align: left; font-size: 10px; text-transform: uppercase; padding: 6px 6px; border-bottom: 1px solid #1f4e79; }
  td { padding: 7px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .totals { margin-top: 12px; margin-left: auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .due { border-top: 2px solid #1f4e79; font-weight: 700; font-size: 13px; margin-top: 4px; padding-top: 6px; }
  .note { color: #555; margin-top: 16px; line-height: 1.4; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .col .card { border: 1px solid #bbb; padding: 6px 8px; margin-bottom: 8px; }
  .card .top { display: flex; justify-content: space-between; color: #555; font-size: 10px; }
  .card .desc { font-weight: 600; margin: 3px 0; }
  .card .bottom { display: flex; justify-content: space-between; }
  .remit { position: absolute; left: 0.6in; right: 0.6in; bottom: 0.95in; border-top: 2px dashed #888; padding-top: 8px; display: flex; justify-content: space-between; color: #444; }
  .foot { position: absolute; left: 0; right: 0; bottom: 0.35in; text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 3px; color: #8a1c1c; }
`;

function head(bill: ExtractedBill, index: number, pageLabel: string): string {
  const n = String(index + 1).padStart(2, "0");
  return `
  <div class="head">
    <div>
      <div class="brand">${esc(bill.providerName)}</div>
      <div class="addr">${100 + index * 10} Example Avenue, Suite ${index + 1}<br>Anytown, CA 90000<br>Billing office (555) 010-01${n}</div>
    </div>
    <div class="stmt">
      <h2>${esc(pageLabel)}</h2>
      <div>Statement date: 10/15/2026</div>
      <div>Account no.: SAMPLE-${n}0042</div>
    </div>
  </div>`;
}

function patientBlock(bill: ExtractedBill, index: number): string {
  const range =
    bill.serviceStart && bill.serviceEnd
      ? bill.serviceStart === bill.serviceEnd
        ? usDate(bill.serviceStart)
        : `${usDate(bill.serviceStart)} - ${usDate(bill.serviceEnd)}`
      : "";
  return `
  <div class="meta">
    <div class="box"><h3>Patient</h3>${esc(PATIENTS[index % PATIENTS.length])}<br>${200 + index} Sample Street<br>Anytown, CA 90000</div>
    <div class="box"><h3>Dates of service</h3>${range}<br><br><h3>Coverage</h3>${esc(
      bill.insuranceStatus === "self_pay" ? "Self-pay" : "Insurance on file",
    )}</div>
  </div>`;
}

function totals(bill: ExtractedBill): string {
  return `
  <div class="totals">
    <div><span>Total charges</span><span class="num">${money(bill.totalBilledCents)}</span></div>
    <div class="due"><span>Balance due</span><span class="num">${money(bill.totalBilledCents)}</span></div>
  </div>`;
}

const footer = () => `<div class="foot">${FOOTER_TEXT}</div>`;

function itemizedRows(items: readonly LineItem[]): string {
  return items
    .map(
      (i) => `<tr>
        <td>${usDate(i.dateOfService)}</td><td>${esc(codeCell(i))}</td><td>${esc(i.descriptionRaw)}</td>
        <td class="num">${i.units}</td><td class="num">${i.unitPriceCents === null ? "" : money(i.unitPriceCents)}</td>
        <td class="num">${money(i.chargeCents)}</td></tr>`,
    )
    .join("");
}

function itemizedTable(items: readonly LineItem[]): string {
  return `<table><thead><tr><th>Date</th><th>Code</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${itemizedRows(items)}</tbody></table>`;
}

function remit(bill: ExtractedBill, index: number): string {
  return `<div class="remit"><span>Please detach and return with payment. Account SAMPLE-${String(index + 1).padStart(2, "0")}0042</span><span>Amount enclosed: $__________</span></div>`;
}

function itemizedPage(bill: ExtractedBill, index: number): string {
  return `<section class="page">
    ${head(bill, index, "ITEMIZED STATEMENT")}
    ${patientBlock(bill, index)}
    ${itemizedTable(bill.lineItems)}
    ${totals(bill)}
    <p class="note">Questions about this statement? Call the billing office. Charges shown are before any insurance adjustments.</p>
    ${remit(bill, index)}
    ${footer()}
  </section>`;
}

function summaryPage(bill: ExtractedBill, index: number): string {
  const rows = bill.lineItems
    .map(
      (i) => `<tr><td>${usDate(i.dateOfService)}</td><td>${esc(i.descriptionRaw)}</td><td>${esc(codeCell(i))}</td><td class="num">${i.units}</td><td class="num">${money(i.chargeCents)}</td></tr>`,
    )
    .join("");
  return `<section class="page">
    ${head(bill, index, "ACCOUNT SUMMARY")}
    ${patientBlock(bill, index)}
    <div class="box" style="margin-bottom:14px"><h3>Summary of charges</h3>
      ${bill.lineItems.length} services &middot; Total charges ${money(bill.totalBilledCents)}</div>
    <table><thead><tr><th>Date</th><th>Service</th><th>Code</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    ${totals(bill)}
    ${remit(bill, index)}
    ${footer()}
  </section>`;
}

function twoColumnPage(bill: ExtractedBill, index: number): string {
  const half = Math.ceil(bill.lineItems.length / 2);
  const card = (i: LineItem) => `<div class="card">
      <div class="top"><span>${usDate(i.dateOfService)}</span><span>Code ${esc(codeCell(i)) || "&mdash;"}</span></div>
      <div class="desc">${esc(i.descriptionRaw)}</div>
      <div class="bottom"><span>Qty ${i.units}</span><span class="num">${money(i.chargeCents)}</span></div>
    </div>`;
  const left = bill.lineItems.slice(0, half).map(card).join("");
  const right = bill.lineItems.slice(half).map(card).join("");
  return `<section class="page">
    ${head(bill, index, "PATIENT STATEMENT")}
    ${patientBlock(bill, index)}
    <div class="cols"><div class="col">${left}</div><div class="col">${right}</div></div>
    ${totals(bill)}
    ${remit(bill, index)}
    ${footer()}
  </section>`;
}

/** Page 1: cover and account summary. Page 2: the itemized detail. */
function twoPageDocument(bill: ExtractedBill, index: number): string {
  const first = `<section class="page">
    ${head(bill, index, "HOSPITAL BILL")}
    ${patientBlock(bill, index)}
    <div class="box"><h3>Account summary</h3>
      Total charges: ${money(bill.totalBilledCents)}<br>
      Itemized services begin on page 2.</div>
    ${totals(bill)}
    <p class="note">Please see the following page for the itemized list of services.</p>
    ${remit(bill, index)}
    ${footer()}
  </section>`;
  const second = `<section class="page">
    ${head(bill, index, "ITEMIZED SERVICES (PAGE 2)")}
    ${itemizedTable(bill.lineItems)}
    ${totals(bill)}
    ${footer()}
  </section>`;
  return first + second;
}

export function renderBillHtml(
  bill: ExtractedBill,
  index: number,
  layout: Layout | "twopage",
): string {
  const body =
    layout === "twopage"
      ? twoPageDocument(bill, index)
      : layout === "summary"
        ? summaryPage(bill, index)
        : layout === "twocolumn"
          ? twoColumnPage(bill, index)
          : itemizedPage(bill, index);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${FOOTER_TEXT}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}
