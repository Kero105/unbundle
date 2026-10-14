"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Plus, Trash2, TriangleAlert } from "lucide-react";
import { submitManualBillAction } from "@/app/bills/manual-actions";
import {
  parseDate,
  parseModifiers,
  parseOptionalMoney,
  parseRequiredText,
  parseUnits,
} from "@/app/bills/[id]/review/fields";
import { FieldInput } from "@/components/field-input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  manualErrorKey,
  MAX_MANUAL_LINES,
  parseManualBill,
  type ManualErrorKey,
} from "@/lib/bills/manual-entry";
import type { ManualDraft } from "@/lib/bills/manual-entry-data";
import { parseManualCode } from "@/lib/bills/manual-fields";
import { formatCents } from "@/lib/money";

type Row = {
  key: number;
  dateOfService: string | null;
  code: string | null;
  descriptionRaw: string;
  modifiers: string[];
  units: number;
  unitPriceCents: number | null;
  /** Null until typed: a charge is required, and $0.00 is a real answer. */
  chargeCents: number | null;
};

type Header = { providerName: string; serviceStart: string | null; serviceEnd: string | null };

function blankRow(key: number): Row {
  return {
    key,
    dateOfService: null,
    code: null,
    descriptionRaw: "",
    modifiers: [],
    units: 1,
    unitPriceCents: null,
    chargeCents: null,
  };
}

function initialRows(draft: ManualDraft | null | undefined): Row[] {
  if (draft && draft.lines.length > 0) {
    return draft.lines.map((line, key) => ({ key, ...line }));
  }
  return [blankRow(0)];
}

/**
 * Type a bill in by hand. The draft lives in this component's memory only: it
 * is not written to browser storage or sent anywhere until "Continue".
 * Zod and the database check everything again on the server.
 */
export function ManualEntryForm({ billId, draft }: { billId?: string; draft?: ManualDraft | null }) {
  const t = useTranslations("Manual");
  const tr = useTranslations("Review");
  const router = useRouter();

  const [header, setHeader] = useState<Header>(
    draft?.header ?? { providerName: "", serviceStart: null, serviceEnd: null },
  );
  const [rows, setRows] = useState<Row[]>(() => initialRows(draft));
  const nextKey = useRef(rows.length);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<ManualErrorKey | "summary" | null>(null);
  const [dirty, setDirty] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const focusNewRow = useRef(false);

  // Warn before a refresh or close throws away typed rows.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!focusNewRow.current) return;
    focusNewRow.current = false;
    list.current?.querySelector<HTMLInputElement>("li:last-child input")?.focus();
  }, [rows.length]);

  function updateRow(key: number, patch: Partial<Row>) {
    setDirty(true);
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (rows.length >= MAX_MANUAL_LINES) return;
    setDirty(true);
    focusNewRow.current = true;
    setRows((prev) => [...prev, blankRow(nextKey.current++)]);
  }

  function removeRow(key: number) {
    if (rows.length <= 1) return;
    setDirty(true);
    setRows((prev) => prev.filter((row) => row.key !== key));
    addButton.current?.focus();
  }

  const total = rows.reduce((sum, row) => sum + (row.chargeCents ?? 0), 0);
  const providerMissing = attempted && header.providerName.trim() === "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setErrorKey(null);

    const payload = {
      ...(billId ? { billId } : {}),
      header,
      lines: rows.map((row) => ({
        dateOfService: row.dateOfService,
        code: row.code,
        descriptionRaw: row.descriptionRaw,
        modifiers: row.modifiers,
        units: row.units,
        unitPriceCents: row.unitPriceCents,
        chargeCents: row.chargeCents,
      })),
    };

    // Same schema the server uses, so a mistake is caught before the round trip.
    if (!parseManualBill(payload, new Date().toISOString().slice(0, 10)).ok) {
      setErrorKey("summary");
      return;
    }

    setPending(true);
    try {
      const result = await submitManualBillAction(payload);
      if (result.ok) {
        setDirty(false);
        router.push(`/bills/${result.billId}/review`);
        return;
      }
      setErrorKey(manualErrorKey(result.error));
    } catch {
      setErrorKey("failed");
    }
    setPending(false);
  }

  return (
    // method="dialog": a native submit (before hydration, or by Enter) does
    // nothing, so typed bill details can never reach the address bar.
    <form method="dialog" className="flex flex-col gap-6" onSubmit={(e) => void submit(e)} noValidate>
      <p className="text-muted-foreground">{t("howTo")}</p>

      <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-2 text-lg font-semibold">{t("billSection")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldInput
              value={header.providerName}
              format={(v) => v}
              parse={parseRequiredText}
              onCommit={(v) => {
                setDirty(true);
                setHeader((h) => ({ ...h, providerName: v }));
              }}
              label={t("provider")}
              visibleLabel={t("provider")}
              error={t("errors.provider")}
              alwaysShowLabel
            />
            {providerMissing ? (
              <p className="mt-1 text-sm text-destructive">{t("errors.provider")}</p>
            ) : null}
          </div>
          <FieldInput
            type="date"
            value={header.serviceStart}
            format={(v) => v ?? ""}
            parse={parseDate}
            onCommit={(v) => {
              setDirty(true);
              setHeader((h) => ({ ...h, serviceStart: v }));
            }}
            label={t("serviceStart")}
            visibleLabel={t("serviceStart")}
            error={tr("errors.date")}
            placeholder={tr("placeholders.date")}
            alwaysShowLabel
          />
          <FieldInput
            type="date"
            value={header.serviceEnd}
            format={(v) => v ?? ""}
            parse={parseDate}
            onCommit={(v) => {
              setDirty(true);
              setHeader((h) => ({ ...h, serviceEnd: v }));
            }}
            label={t("serviceEnd")}
            visibleLabel={t("serviceEnd")}
            error={tr("errors.date")}
            placeholder={tr("placeholders.date")}
            alwaysShowLabel
          />
        </div>
        <p className="text-sm text-muted-foreground">{t("datesHint")}</p>
      </fieldset>

      <section aria-labelledby="manual-lines" className="flex flex-col gap-4">
        <h2 id="manual-lines" className="text-lg font-semibold">
          {t("linesSection")}
        </h2>
        <ol ref={list} className="flex flex-col gap-4">
          {rows.map((row, index) => {
            const n = index + 1;
            const field = (name: string) => tr("rowField", { field: name, row: n });
            return (
              <li key={row.key}>
                <fieldset className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <legend className="px-2 font-semibold">{t("lineHeading", { row: n })}</legend>
                  <FieldInput
                    type="date"
                    value={row.dateOfService}
                    format={(v) => v ?? ""}
                    parse={parseDate}
                    onCommit={(v) => updateRow(row.key, { dateOfService: v })}
                    label={field(tr("columns.date"))}
                    visibleLabel={tr("columns.date")}
                    error={tr("errors.date")}
                    placeholder={tr("placeholders.date")}
                    alwaysShowLabel
                  />
                  <FieldInput
                    value={row.code}
                    format={(v) => v ?? ""}
                    parse={parseManualCode}
                    onCommit={(v) => updateRow(row.key, { code: v })}
                    label={field(tr("columns.code"))}
                    visibleLabel={tr("columns.code")}
                    error={t("errors.code")}
                    placeholder={tr("placeholders.code")}
                    alwaysShowLabel
                  />
                  <div className="sm:col-span-2">
                    <FieldInput
                      value={row.descriptionRaw}
                      format={(v) => v}
                      parse={parseRequiredText}
                      onCommit={(v) => updateRow(row.key, { descriptionRaw: v })}
                      label={field(tr("columns.description"))}
                      visibleLabel={tr("columns.description")}
                      error={tr("errors.description")}
                      alwaysShowLabel
                    />
                    {attempted && row.descriptionRaw.trim() === "" ? (
                      <p className="mt-1 text-sm text-destructive">{t("errors.descriptionRequired")}</p>
                    ) : null}
                  </div>
                  <FieldInput
                    value={row.units}
                    format={String}
                    parse={parseUnits}
                    onCommit={(v) => updateRow(row.key, { units: v })}
                    label={field(tr("columns.units"))}
                    visibleLabel={tr("columns.units")}
                    error={tr("errors.units")}
                    inputMode="numeric"
                    alwaysShowLabel
                  />
                  <FieldInput
                    value={row.unitPriceCents}
                    format={(v) => (v === null ? "" : formatCents(v))}
                    parse={parseOptionalMoney}
                    onCommit={(v) => updateRow(row.key, { unitPriceCents: v })}
                    label={field(tr("columns.unitPrice"))}
                    visibleLabel={tr("columns.unitPrice")}
                    error={tr("errors.money")}
                    inputMode="decimal"
                    className="text-right tabular-nums"
                    alwaysShowLabel
                  />
                  <div>
                    <FieldInput
                      value={row.chargeCents}
                      format={(v) => (v === null ? "" : formatCents(v))}
                      parse={parseOptionalMoney}
                      onCommit={(v) => updateRow(row.key, { chargeCents: v })}
                      label={field(tr("columns.charge"))}
                      visibleLabel={tr("columns.charge")}
                      error={tr("errors.money")}
                      inputMode="decimal"
                      className="text-right tabular-nums"
                      alwaysShowLabel
                    />
                    {attempted && row.chargeCents === null ? (
                      <p className="mt-1 text-sm text-destructive">{t("errors.chargeRequired")}</p>
                    ) : null}
                  </div>
                  <FieldInput
                    value={row.modifiers}
                    format={(v) => v.join(", ")}
                    parse={parseModifiers}
                    onCommit={(v) => updateRow(row.key, { modifiers: v })}
                    label={field(tr("columns.modifiers"))}
                    visibleLabel={tr("columns.modifiers")}
                    error={tr("errors.modifiers")}
                    placeholder={tr("placeholders.modifiers")}
                    alwaysShowLabel
                  />
                  <div className="flex items-end sm:col-span-2 lg:col-span-4 lg:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={rows.length <= 1}
                      aria-label={t("removeLine", { row: n })}
                      onClick={() => removeRow(row.key)}
                    >
                      <Trash2 aria-hidden="true" />
                      {t("remove")}
                    </Button>
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-2">
          <Button
            ref={addButton}
            type="button"
            variant="outline"
            className="self-start"
            disabled={rows.length >= MAX_MANUAL_LINES}
            aria-describedby={rows.length >= MAX_MANUAL_LINES ? "manual-limit" : undefined}
            onClick={addRow}
          >
            <Plus aria-hidden="true" />
            {t("addLine")}
          </Button>
          {rows.length >= MAX_MANUAL_LINES ? (
            <p id="manual-limit" className="text-sm text-muted-foreground">
              {t("lineLimit", { max: MAX_MANUAL_LINES })}
            </p>
          ) : null}
        </div>

        <p aria-live="polite" className="text-lg font-semibold tabular-nums">
          {t("total", { amount: formatCents(total) })}
        </p>
      </section>

      <aside className="flex gap-3 rounded-lg border bg-muted/40 p-4">
        <Lock aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-semibold">{t("privacy.title")}</p>
          <p className="text-muted-foreground">{t("privacy.body")}</p>
          <Link
            href="/privacy"
            className="mt-2 inline-block font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            {t("privacy.more")}
          </Link>
        </div>
      </aside>

      {errorKey ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-surface p-4 text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          {t("cancel")}
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : null}
          {pending ? t("submitPending") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
