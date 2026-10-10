"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
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
  error,
  type = "text",
  inputMode,
  placeholder,
  className,
}: FieldInputProps<T>) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

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
      <Input
        type={type}
        inputMode={inputMode}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        placeholder={placeholder}
        className={className}
        value={draft ?? format(value)}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {invalid ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function needsAttention(item: LineItem) {
  return item.confidence === "low" && !item.userVerified;
}

export function ReviewTable({ bill }: { bill: ExtractedBill }) {
  const t = useTranslations("Review");
  const locale = useLocale();
  const [items, setItems] = useState<LineItem[]>(bill.lineItems);

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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card size="sm">
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">{t("provider")}</dt>
                <dd className="font-medium">{bill.providerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("serviceDates")}</dt>
                <dd className="font-medium">{serviceDates}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("totalBilled")}</dt>
                <dd className="font-medium">{formatCents(bill.totalBilledCents)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
              {t("progress", { verified: verifiedCount, total: items.length })} ·{" "}
              {attentionCount > 0
                ? t("needsAttention", { count: attentionCount })
                : t("allClear")}
            </p>
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table className="min-w-[64rem]">
            <TableCaption className="sr-only">{t("tableLabel")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">{t("columns.date")}</TableHead>
                <TableHead className="w-28">{t("columns.code")}</TableHead>
                <TableHead className="min-w-56">{t("columns.description")}</TableHead>
                <TableHead className="w-20">{t("columns.units")}</TableHead>
                <TableHead className="w-28">{t("columns.unitPrice")}</TableHead>
                <TableHead className="w-28">{t("columns.charge")}</TableHead>
                <TableHead className="w-28">{t("columns.modifiers")}</TableHead>
                <TableHead className="w-32">{t("columns.status")}</TableHead>
                <TableHead className="w-20">{t("columns.verified")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const row = index + 1;
                const field = (name: string) =>
                  t("rowField", { field: name, row });
                const highlight = needsAttention(item);
                return (
                  <TableRow
                    key={item.id}
                    data-confidence={item.confidence}
                    data-verified={item.userVerified}
                    className={cn(
                      "align-top",
                      highlight &&
                        "bg-amber-100/70 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/20",
                    )}
                  >
                    <TableCell>
                      <FieldInput
                        type="date"
                        value={item.dateOfService}
                        format={(v) => v ?? ""}
                        parse={parseDate}
                        onCommit={(v) => update(item.id, { dateOfService: v })}
                        label={field(t("columns.date"))}
                        error={t("errors.date")}
                      />
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        value={item.code}
                        format={(v) => v ?? ""}
                        parse={parseOptionalText}
                        onCommit={(v) => update(item.id, { code: v })}
                        label={field(t("columns.code"))}
                        error=""
                        placeholder={t("placeholders.code")}
                      />
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        value={item.descriptionRaw}
                        format={(v) => v}
                        parse={parseRequiredText}
                        onCommit={(v) => update(item.id, { descriptionRaw: v })}
                        label={field(t("columns.description"))}
                        error={t("errors.description")}
                      />
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        value={item.units}
                        format={String}
                        parse={parseUnits}
                        onCommit={(v) => update(item.id, { units: v })}
                        label={field(t("columns.units"))}
                        error={t("errors.units")}
                        inputMode="numeric"
                      />
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        value={item.unitPriceCents}
                        format={(v) => (v === null ? "" : formatCents(v))}
                        parse={parseOptionalMoney}
                        onCommit={(v) => update(item.id, { unitPriceCents: v })}
                        label={field(t("columns.unitPrice"))}
                        error={t("errors.money")}
                        inputMode="decimal"
                        className="text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        value={item.chargeCents}
                        format={formatCents}
                        parse={parseMoney}
                        onCommit={(v) => update(item.id, { chargeCents: v })}
                        label={field(t("columns.charge"))}
                        error={t("errors.money")}
                        inputMode="decimal"
                        className="text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        value={item.modifiers}
                        format={(v) => v.join(", ")}
                        parse={parseModifiers}
                        onCommit={(v) => update(item.id, { modifiers: v })}
                        label={field(t("columns.modifiers"))}
                        error={t("errors.modifiers")}
                        placeholder={t("placeholders.modifiers")}
                      />
                    </TableCell>
                    <TableCell>
                      {item.userVerified ? (
                        <Badge variant="secondary">{t("status.verified")}</Badge>
                      ) : item.confidence === "low" ? (
                        <Badge variant="destructive">{t("status.lowConfidence")}</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={item.userVerified}
                        onCheckedChange={(checked) =>
                          update(item.id, { userVerified: checked === true })
                        }
                        aria-label={t("markVerified", { row })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <aside>
        <Card size="sm" className="xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle>{t("source.title")}</CardTitle>
            <CardDescription>{t("source.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-[8.5/11] items-center justify-center rounded-lg border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              {t("source.placeholder")}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
