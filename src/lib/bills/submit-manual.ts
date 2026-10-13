import { MAX_BILLS_PER_USER } from "./limits";
import { interpretManualSubmit, parseManualBill, type ManualBillInput, type ManualSubmitError } from "./manual-entry";

/** Persistence, injected so the flow is testable without a database. */
export interface ManualSubmitStore {
  countBills(): Promise<number>;
  /** Creates an empty bill owned by the caller and returns its id. */
  createBill(): Promise<string>;
  /** Removes a bill (and, by cascade, anything under it). */
  deleteBill(billId: string): Promise<void>;
  /** Calls submit_manual_bill() and returns its raw text result. */
  submit(args: {
    billId: string;
    header: ManualBillInput["header"];
    lines: ManualBillInput["lines"];
  }): Promise<unknown>;
}

export type ManualSubmitResult =
  | { ok: true; billId: string }
  | { ok: false; error: ManualSubmitError };

/**
 * Validates the typed bill and hands it to the database function that writes
 * the rows and moves the bill to needs_review. With no billId the bill is
 * created here, lazily, and removed again if the function does not accept it,
 * so a rejected draft never leaves an empty bill behind.
 */
export async function submitManualBill(args: {
  store: ManualSubmitStore;
  input: unknown;
  today: string;
}): Promise<ManualSubmitResult> {
  const { store } = args;
  const parsed = parseManualBill(args.input, args.today);
  if (!parsed.ok) return { ok: false, error: "invalid" };
  const { header, lines } = parsed.value;

  let billId = parsed.value.billId;
  const created = billId === undefined;

  if (billId === undefined) {
    try {
      if ((await store.countBills()) >= MAX_BILLS_PER_USER) {
        return { ok: false, error: "too_many_bills" };
      }
      billId = await store.createBill();
    } catch {
      return { ok: false, error: "save_failed" };
    }
  }

  let error: ManualSubmitError | null;
  try {
    error = interpretManualSubmit(await store.submit({ billId, header, lines }));
  } catch {
    error = "save_failed";
  }

  if (error === null) return { ok: true, billId };

  if (created) {
    try {
      await store.deleteBill(billId);
    } catch {
      // Best effort: a leftover empty bill shows on the dashboard and can be deleted there.
    }
  }
  return { ok: false, error };
}
