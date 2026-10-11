import type { EobLine, ExtractedBill, LineItem } from "@/lib/types";

export type ReconciliationStatus =
  | "match"
  | "billHigher"
  | "billLower"
  | "denied"
  | "unknown"
  | "notOnEob"
  | "notOnBill";

export interface ReconciliationRow {
  key: string;
  dateOfService: string | null;
  code: string | null;
  /** What the bill charges for the service (line charge), when the line is on the bill. */
  billChargeCents: number | null;
  eobBilledCents: number | null;
  allowedCents: number | null;
  planPaidCents: number | null;
  eobPatientResponsibilityCents: number | null;
  billPatientOwesCents: number | null;
  /** Bill patient amount minus EOB patient responsibility, when both are known. */
  differenceCents: number | null;
  status: ReconciliationStatus;
  lineItemId: string | null;
}

const keyOf = (date: string | null, code: string | null) =>
  date !== null && code !== null ? `${date}|${code}` : null;

function row(
  line: LineItem | null,
  eob: EobLine | null,
  key: string,
): ReconciliationRow {
  const eobOwed = eob?.patientResponsibilityCents ?? null;
  const billOwed = line?.patientOwesCents ?? null;
  const difference = eobOwed !== null && billOwed !== null ? billOwed - eobOwed : null;
  const denied = eob !== null && eob.denialReason !== null && eob.denialReason.trim() !== "";

  let status: ReconciliationStatus;
  if (line === null) status = "notOnBill";
  else if (eob === null) status = "notOnEob";
  else if (denied) status = "denied";
  else if (difference === null) status = "unknown";
  else status = difference > 0 ? "billHigher" : difference < 0 ? "billLower" : "match";

  return {
    key,
    dateOfService: line?.dateOfService ?? eob?.dateOfService ?? null,
    code: line?.code ?? eob?.code ?? null,
    billChargeCents: line?.chargeCents ?? null,
    eobBilledCents: eob?.billedCents ?? null,
    allowedCents: eob?.allowedCents ?? null,
    planPaidCents: eob?.planPaidCents ?? null,
    eobPatientResponsibilityCents: eobOwed,
    billPatientOwesCents: billOwed,
    differenceCents: difference,
    status,
    lineItemId: line?.id ?? null,
  };
}

/**
 * Pairs bill lines with EOB lines by date of service and code, in the order
 * they appear. Lines that cannot be keyed (no date or code) are never paired:
 * a bill line without a key is "not on the EOB", an EOB line without one is
 * "on the EOB, not on the bill". Pure display logic: it never creates
 * findings; those come from `src/lib/rules`.
 */
export function buildEobReconciliation(bill: ExtractedBill): ReconciliationRow[] {
  if (bill.eobLines.length === 0) return [];

  const eobsByKey = new Map<string, EobLine[]>();
  for (const eob of bill.eobLines) {
    const k = keyOf(eob.dateOfService, eob.code);
    if (k) eobsByKey.set(k, [...(eobsByKey.get(k) ?? []), eob]);
  }

  const rows: ReconciliationRow[] = [];
  const usedEob = new Set<string>();

  bill.lineItems.forEach((line, index) => {
    const k = keyOf(line.dateOfService, line.code);
    const candidates = k ? eobsByKey.get(k) : undefined;
    const match = candidates?.find((e) => !usedEob.has(e.id)) ?? null;
    if (match) usedEob.add(match.id);
    rows.push(row(line, match, `line:${line.id}:${index}`));
  });

  bill.eobLines.forEach((eob, index) => {
    if (!usedEob.has(eob.id)) rows.push(row(null, eob, `eob:${eob.id}:${index}`));
  });

  return rows;
}

/** True when the bill has an EOB and at least one row needs attention. */
export function hasReconciliationMismatch(rows: readonly ReconciliationRow[]): boolean {
  return rows.some((r) => r.status === "billHigher" || r.status === "billLower");
}
