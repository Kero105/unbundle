"use client";

import { Fragment, useId, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, FileText, TriangleAlert, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import type { ExtractedBill, LineItem } from "@/lib/types";
import {
  parseDate,
  parseModifiers,
  parseMoney,
  parseOptionalMoney,
  parseOptionalText,
  parseRequiredText,
  parseUnits,
  type ParseResult,
} from "./fields";

type FieldInputProps<T> = {
  value: T;
  format: (value: T) => string;
  parse: (text: string) => ParseResult<T>;
  onCommit: (value: T) => void;
  label: string;
  /** Short visible label, shown in the stacked mobile layout only. */
  visibleLabel: string;
  error: string;
  type?: "text" | "date";
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  className?: string;
};

/**
 * Text input that keeps its own draft and commits only a valid parse on blur
 * or Enter. An invalid draft stays on screen, flagged, and never reaches state.
 */
function FieldInput<T>({
  value,
  format,
  parse,
  onCommit,
  label,
  visibleLabel,
  error,
  type = "text",
  inputMode,
  placeholder,
  className,
}: FieldInputProps<T>) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();
  const inputId = useId();
  const [focused, setFocused] = useState(false);
  const shown = draft ?? format(value);
  // An empty native date input shows "mm/dd/yyyy" and can't be relabeled, so
  // while it is empty and unfocused it is a text input showing our placeholder.
  const effectiveType = type === "date" && shown === "" && !focused ? "text" : type;

  function commit() {
    if (draft === null) return;
    const result = parse(draft);
    if (result.ok) {
      onCommit(result.value);
      setDraft(null);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-muted-foreground lg:sr-only"
      >
        {visibleLabel}
      </label>
      <Input
        id={inputId}
        type={effectiveType}
        inputMode={inputMode}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        placeholder={placeholder}
        className={className}
        value={shown}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {invalid ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function needsAttention(item: LineItem) {
  return item.confidence === "low" && !item.userVerified;
}

const COLUMN_COUNT = 8;

function Missing({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}

export function ReviewTable({ bill, billId }: { bill: ExtractedBill; billId: string }) {
  const t = useTranslations("Review");
  const locale = useLocale();
  const [items, setItems] = useState<LineItem[]>(bill.lineItems);
  const helperId = useId();

  function update(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  const verifiedCount = items.filter((i) => i.userVerified).length;
  const attentionCount = items.filter(needsAttention).length;

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const formatDay = (iso: string) => dateFormatter.format(new Date(`${iso}T00:00:00Z`));
  const serviceDates =
    bill.serviceStart && bill.serviceEnd
      ? bill.serviceStart === bill.serviceEnd
        ? formatDay(bill.serviceStart)
        : t("serviceDatesRange", {
            start: formatDay(bill.serviceStart),
            end: formatDay(bill.serviceEnd),
          })
      : t("serviceDatesUnknown");

  const progressText = t("progress", { verified: verifiedCount, total: items.length });

  const sourcePlaceholder = (
    <div className="flex aspect-[8.5/11] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/40 p-6 text-center text-muted-foreground">
      <FileText aria-hidden="true" className="size-8" />
      <p>{t("source.placeholder")}</p>
    </div>
  );

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-6">
            <dl className="grid gap-6 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("provider")}</dt>
                <dd className="mt-1 text-lg font-semibold">{bill.providerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("serviceDates")}</dt>
                <dd className="mt-1 text-lg font-semibold">{serviceDates}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t("totalBilled")}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatCents(bill.totalBilledCents)}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-3" aria-live="polite">
              <Progress
                value={verifiedCount}
                max={items.length}
                label={t("progressLabel")}
                valueText={progressText}
              />
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{progressText}</span>
                <span className="text-muted-foreground">·</span>
                {attentionCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-warning-foreground">
                    <TriangleAlert aria-hidden="true" className="size-4" />
                    {t("needsAttention", { count: attentionCount })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-success-foreground">
                    <CircleCheck aria-hidden="true" className="size-4" />
                    {t("allClear")}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <details className="rounded-lg border bg-card 2xl:hidden">
          <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 font-medium">
            <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
            {t("source.title")}
          </summary>
          <div className="px-4 pb-4">
            <p className="mb-4 text-muted-foreground">{t("source.description")}</p>
            <div className="mx-auto max-w-sm">{sourcePlaceholder}</div>
          </div>
        </details>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <Table className="max-lg:block lg:min-w-[60rem]">
            <TableCaption className="sr-only">{t("tableLabel")}</TableCaption>
            <TableHeader className="max-lg:hidden">
              <TableRow className="bg-muted/60">
                <TableHead className="w-40">{t("columns.date")}</TableHead>
                <TableHead className="w-28">{t("columns.code")}</TableHead>
                <TableHead className="min-w-48">{t("columns.description")}</TableHead>
                <TableHead className="w-20">{t("columns.units")}</TableHead>
                <TableHead className="w-32">{t("columns.unitPrice")}</TableHead>
                <TableHead className="w-32">{t("columns.charge")}</TableHead>
                <TableHead className="w-28">{t("columns.modifiers")}</TableHead>
                <TableHead className="w-40">{t("columns.verified")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-lg:flex max-lg:flex-col max-lg:gap-4">
              {items.map((item, index) => {
                const row = index + 1;
                const field = (name: string) => t("rowField", { field: name, row });
                const attention = needsAttention(item);
                // On desktop the first visible cell is the second <td>: the first
                // is the phone-only summary and is hidden at lg.
                // On desktop the first visible cell is the second <td>: the first
                // is the phone-only summary and is hidden at lg.
                const rowTone = attention
                  ? "bg-warning-surface hover:bg-warning-surface max-lg:border-l-4 max-lg:border-l-warning-border lg:[&>td:nth-child(2)]:shadow-[inset_4px_0_0_var(--warning-border)]"
                  : item.userVerified
                    ? "bg-card max-lg:border-l-4 max-lg:border-l-success-border lg:[&>td:nth-child(2)]:shadow-[inset_4px_0_0_var(--success-border)]"
                    : "bg-card";
                const statusBadge = item.userVerified ? (
                  <Badge variant="success">
                    <Check aria-hidden="true" />
                    {t("status.verified")}
                  </Badge>
                ) : attention ? (
                  <Badge variant="warning">
                    <TriangleAlert aria-hidden="true" />
                    {t("status.lowConfidence")}
                  </Badge>
                ) : null;

                return (
                  <Fragment key={item.id}>
                    <TableRow
                      data-confidence={item.confidence}
                      data-verified={item.userVerified}
                      className={cn(
                        "align-top max-lg:grid max-lg:grid-cols-2 max-lg:gap-4 max-lg:rounded-lg max-lg:border max-lg:p-4",
                        attention && "lg:border-b-0",
                        rowTone,
                      )}
                    >
                      {/* Stacked-card summary: phones and tablets only. */}
                      <TableCell className="col-span-2 flex flex-col gap-2 lg:hidden">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {t("rowHeading", { row })}
                          </span>
                          {statusBadge}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.dateOfService ? (
                            formatDay(item.dateOfService)
                          ) : (
                            <Missing>{t("missing.date")}</Missing>
                          )}
                          {" · "}
                          {item.code ?? <Missing>{t("missing.code")}</Missing>}
                        </p>
                        <p className="text-lg font-semibold break-words">{item.descriptionRaw}</p>
                        <p className="tabular-nums">
                          {t("equation", {
                            units: item.units,
                            price:
                              item.unitPriceCents === null
                                ? t("missing.price")
                                : formatCents(item.unitPriceCents),
                            charge: formatCents(item.chargeCents),
                          })}
                        </p>
                        {attention ? (
                          <p className="flex items-start gap-2 text-warning-foreground">
                            <TriangleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
                            {t("lowConfidenceReason")}
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell className="max-lg:p-0">
                        <FieldInput
                          type="date"
                          value={item.dateOfService}
                          format={(v) => v ?? ""}
                          parse={parseDate}
                          onCommit={(v) => update(item.id, { dateOfService: v })}
                          label={field(t("columns.date"))}
                          visibleLabel={t("columns.date")}
                          error={t("errors.date")}
                          placeholder={t("placeholders.date")}
                        />
                      </TableCell>
                      <TableCell className="max-lg:p-0">
                        <FieldInput
                          value={item.code}
                          format={(v) => v ?? ""}
                          parse={parseOptionalText}
                          onCommit={(v) => update(item.id, { code: v })}
                          label={field(t("columns.code"))}
                          visibleLabel={t("columns.code")}
                          error=""
                          placeholder={t("placeholders.code")}
                        />
                      </TableCell>
                      <TableCell className="max-lg:col-span-2 max-lg:p-0">
                        <FieldInput
                          value={item.descriptionRaw}
                          format={(v) => v}
                          parse={parseRequiredText}
                          onCommit={(v) => update(item.id, { descriptionRaw: v })}
                          label={field(t("columns.description"))}
                          visibleLabel={t("columns.description")}
                          error={t("errors.description")}
                        />
                      </TableCell>
                      <TableCell className="max-lg:p-0">
                        <FieldInput
                          value={item.units}
                          format={String}
                          parse={parseUnits}
                          onCommit={(v) => update(item.id, { units: v })}
                          label={field(t("columns.units"))}
                          visibleLabel={t("columns.units")}
                          error={t("errors.units")}
                          inputMode="numeric"
                        />
                      </TableCell>
                      <TableCell className="max-lg:p-0">
                        <FieldInput
                          value={item.unitPriceCents}
                          format={(v) => (v === null ? "" : formatCents(v))}
                          parse={parseOptionalMoney}
                          onCommit={(v) => update(item.id, { unitPriceCents: v })}
                          label={field(t("columns.unitPrice"))}
                          visibleLabel={t("columns.unitPrice")}
                          error={t("errors.money")}
                          inputMode="decimal"
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="max-lg:p-0">
                        <FieldInput
                          value={item.chargeCents}
                          format={formatCents}
                          parse={parseMoney}
                          onCommit={(v) => update(item.id, { chargeCents: v })}
                          label={field(t("columns.charge"))}
                          visibleLabel={t("columns.charge")}
                          error={t("errors.money")}
                          inputMode="decimal"
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="max-lg:p-0">
                        <FieldInput
                          value={item.modifiers}
                          format={(v) => v.join(", ")}
                          parse={parseModifiers}
                          onCommit={(v) => update(item.id, { modifiers: v })}
                          label={field(t("columns.modifiers"))}
                          visibleLabel={t("columns.modifiers")}
                          error={t("errors.modifiers")}
                          placeholder={t("placeholders.modifiers")}
                        />
                      </TableCell>
                      <TableCell className="max-lg:col-span-2 max-lg:p-0">
                        <div className="flex items-center gap-3">
                          <label className="flex min-h-11 items-center gap-3">
                            <Checkbox
                              checked={item.userVerified}
                              onCheckedChange={(checked) =>
                                update(item.id, { userVerified: checked === true })
                              }
                              aria-label={t("markVerified", { row })}
                            />
                            <span className="font-medium lg:sr-only">{t("verifyThisRow")}</span>
                          </label>
                          <span className="max-lg:hidden">{statusBadge}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {attention ? (
                      <TableRow className={cn(
                          "max-lg:hidden bg-warning-surface hover:bg-warning-surface lg:[&>td:first-child]:shadow-[inset_4px_0_0_var(--warning-border)]",
                        )}
                      >
                        <TableCell
                          colSpan={COLUMN_COUNT}
                          className="pt-0 pb-3 pl-6 text-warning-foreground"
                        >
                          <span className="inline-flex items-center gap-2">
                            <TriangleAlert className="size-4" />
                            {t("lowConfidenceReason")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <aside className="hidden 2xl:block">
        <Card size="sm" className="sticky top-6">
          <CardHeader>
            <CardTitle>{t("source.title")}</CardTitle>
            <CardDescription>{t("source.description")}</CardDescription>
          </CardHeader>
          <CardContent>{sourcePlaceholder}</CardContent>
        </Card>
      </aside>

      <section
        aria-label={t("actions.label")}
        className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 2xl:col-span-2"
      >
        <div className="mx-auto flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            id={helperId}
            aria-live="polite"
            className={cn(
              "flex items-center gap-2",
              attentionCount > 0 ? "text-warning-foreground" : "text-success-foreground",
            )}
          >
            {attentionCount > 0 ? (
              <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
            ) : (
              <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
            )}
            {attentionCount > 0
              ? t("actions.blocked", { count: attentionCount })
              : t("actions.ready")}
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline">
              {t("actions.save")}
            </Button>
            {attentionCount > 0 ? (
              <Button type="button" disabled focusableWhenDisabled aria-describedby={helperId}>
                {t("actions.continue")}
              </Button>
            ) : (
              <Link
                href={`/bills/${encodeURIComponent(billId)}/report`}
                aria-describedby={helperId}
                className={buttonVariants()}
              >
                {t("actions.continue")}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
