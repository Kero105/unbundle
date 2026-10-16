"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ListChecks,
  ScanSearch,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { FieldInput } from "@/components/field-input";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import type { LineItem } from "@/lib/types";
import { isExplainableCode } from "@/lib/explain/validate";
import { ExplainPanel } from "./explain-disclosure";
import {
  parseDate,
  parseModifiers,
  parseMoney,
  parseOptionalMoney,
  parseOptionalText,
  parseRequiredText,
  parseUnits,
} from "./fields";

function needsAttention(item: LineItem) {
  return item.confidence === "low" && !item.userVerified;
}

/** Flagged rows first, then the rest; each group keeps the bill's order. */
function reviewOrder(items: LineItem[]) {
  const flagged = items.filter(needsAttention);
  const rest = items.filter((item) => !needsAttention(item));
  return [...flagged, ...rest].map((item) => item.id);
}

/**
 * Phones only (under 640px): the rows one at a time as a full-width card.
 * Mounted by the review table in place of the table, so there is one set of
 * inputs on screen. Remounted (via key) when the sample is reset.
 */
export function ReviewCards({
  items,
  update,
  selectedId,
  onSelect,
  onShowOnBill,
  explain,
  onToggleExplain,
  manual,
  demo,
}: {
  items: LineItem[];
  update: (id: string, patch: Partial<LineItem>) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onShowOnBill: (id: string) => void;
  explain: Record<string, boolean>;
  onToggleExplain: (id: string) => void;
  manual: boolean;
  demo: boolean;
}) {
  const t = useTranslations("Review");
  const tExplain = useTranslations("Explain");
  // Fixed when the cards mount: verifying a flagged row must not make the
  // card you are on jump to a different position.
  const [order] = useState(() => reviewOrder(items));
  const [pos, setPos] = useState(0);
  const [listOpen, setListOpen] = useState(false);

  const total = order.length;
  const safePos = Math.min(pos, total - 1);
  const item = items.find((i) => i.id === order[safePos]);
  if (!item) return null;
  const row = items.indexOf(item) + 1;
  const attention = needsAttention(item);
  const field = (name: string) => t("rowField", { field: name, row });
  const explainable = isExplainableCode(item.code);

  function go(next: number) {
    const clamped = Math.max(0, Math.min(total - 1, next));
    setPos(clamped);
    onSelect(order[clamped]);
  }

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
    <section aria-label={t("phone.cardsLabel")} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" aria-atomic="true" className="font-semibold">
          {t("phone.position", { current: safePos + 1, total })}
        </p>
        <DialogPrimitive.Root open={listOpen} onOpenChange={setListOpen}>
          <DialogPrimitive.Trigger render={<Button type="button" variant="secondary" />}>
            <ListChecks aria-hidden="true" />
            {t("phone.allRows")}
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Popup
              aria-label={t("phone.allRowsTitle")}
              className="fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-none"
            >
              <div className="flex items-center justify-between gap-3 border-b px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
                <DialogPrimitive.Title className="text-lead font-semibold">
                  {t("phone.allRowsTitle")}
                </DialogPrimitive.Title>
                <DialogPrimitive.Close render={<Button type="button" variant="ghost" />}>
                  <X aria-hidden="true" />
                  {t("phone.close")}
                </DialogPrimitive.Close>
              </div>
              <ul className="flex-1 overflow-y-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {items.map((entry, index) => {
                  const flagged = needsAttention(entry);
                  const current = entry.id === item.id;
                  return (
                    <li key={entry.id} className="border-b last:border-b-0">
                      <button
                        type="button"
                        aria-current={current ? "true" : undefined}
                        onClick={() => {
                          go(order.indexOf(entry.id));
                          setListOpen(false);
                        }}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 rounded-control px-2 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring",
                          current && "bg-muted",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-muted-foreground">
                            {t("rowHeading", { row: index + 1 })}
                            {entry.code ? ` · ${entry.code}` : ""}
                          </span>
                          <span className="block truncate font-medium">{entry.descriptionRaw}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1 tabular-nums">
                          <span className="font-semibold">{formatCents(entry.chargeCents)}</span>
                          {entry.userVerified ? (
                            <span className="inline-flex items-center gap-1 text-sm text-success-foreground">
                              <Check aria-hidden="true" className="size-4" />
                              {t("status.verified")}
                            </span>
                          ) : flagged ? (
                            <span className="inline-flex items-center gap-1 text-sm text-warning-foreground">
                              <TriangleAlert aria-hidden="true" className="size-4" />
                              {t("status.lowConfidence")}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </DialogPrimitive.Popup>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>

      <Card
        key={item.id}
        data-confidence={item.confidence}
        data-verified={item.userVerified}
        data-selected={item.id === selectedId}
        onFocusCapture={() => onSelect(item.id)}
        className={cn(
          "border-l-4",
          attention
            ? "border-l-warning-border"
            : item.userVerified
              ? "border-l-success-border"
              : "border-l-transparent",
        )}
      >
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t("rowHeading", { row })}</h2>
            {statusBadge}
          </div>
          <FieldInput
            alwaysShowLabel
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
          <FieldInput
            alwaysShowLabel
            value={item.code}
            format={(v) => v ?? ""}
            parse={parseOptionalText}
            onCommit={(v) => update(item.id, { code: v })}
            label={field(t("columns.code"))}
            visibleLabel={t("columns.code")}
            error=""
            placeholder={t("placeholders.code")}
          />
          <FieldInput
            alwaysShowLabel
            value={item.descriptionRaw}
            format={(v) => v}
            parse={parseRequiredText}
            onCommit={(v) => update(item.id, { descriptionRaw: v })}
            label={field(t("columns.description"))}
            visibleLabel={t("columns.description")}
            error={t("errors.description")}
          />
          <FieldInput
            alwaysShowLabel
            value={item.units}
            format={String}
            parse={parseUnits}
            onCommit={(v) => update(item.id, { units: v })}
            label={field(t("columns.units"))}
            visibleLabel={t("columns.units")}
            error={t("errors.units")}
            inputMode="numeric"
          />
          <FieldInput
            alwaysShowLabel
            value={item.unitPriceCents}
            format={(v) => (v === null ? "" : formatCents(v))}
            parse={parseOptionalMoney}
            onCommit={(v) => update(item.id, { unitPriceCents: v })}
            label={field(t("columns.unitPrice"))}
            visibleLabel={t("columns.unitPrice")}
            error={t("errors.money")}
            inputMode="decimal"
            className="tabular-nums"
          />
          <FieldInput
            alwaysShowLabel
            value={item.chargeCents}
            format={formatCents}
            parse={parseMoney}
            onCommit={(v) => update(item.id, { chargeCents: v })}
            label={field(t("columns.charge"))}
            visibleLabel={t("columns.charge")}
            error={t("errors.money")}
            inputMode="decimal"
            className="tabular-nums"
          />
          <FieldInput
            alwaysShowLabel
            value={item.modifiers}
            format={(v) => v.join(", ")}
            parse={parseModifiers}
            onCommit={(v) => update(item.id, { modifiers: v })}
            label={field(t("columns.modifiers"))}
            visibleLabel={t("columns.modifiers")}
            error={t("errors.modifiers")}
            placeholder={t("placeholders.modifiers")}
          />
          <label className="flex min-h-11 items-center gap-3">
            <Checkbox
              checked={item.userVerified}
              onCheckedChange={(checked) => update(item.id, { userVerified: checked === true })}
              aria-label={t("markVerified", { row })}
            />
            <span className="font-medium">{t("verifyThisRow")}</span>
          </label>
          {manual && !explainable ? null : (
            <div className="flex flex-wrap gap-2">
              {manual ? null : (
                <Button
                  id={`show-on-bill-${item.id}`}
                  type="button"
                  variant="secondary"
                  aria-label={t("source.showOnBillRow", { row })}
                  aria-pressed={item.id === selectedId}
                  onClick={() => onShowOnBill(item.id)}
                  className="min-w-0 flex-1"
                >
                  <ScanSearch aria-hidden="true" />
                  {t("source.showOnBill")}
                </Button>
              )}
              {explainable ? (
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={tExplain("summaryRow", { row })}
                  aria-expanded={explain[item.id] === true}
                  aria-controls={`explain-${item.id}`}
                  onClick={() => onToggleExplain(item.id)}
                  className="min-w-0 flex-1"
                >
                  <CircleHelp aria-hidden="true" />
                  {tExplain("summary")}
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* A row's answer stays mounted once opened (hidden when you move on), so
          coming back to it does not ask again. */}
      {items.map((entry) =>
        isExplainableCode(entry.code) && entry.id in explain ? (
          <div key={entry.id} className={cn(!(entry.id === item.id && explain[entry.id]) && "hidden")}>
            <ExplainPanel
              id={`explain-${entry.id}`}
              code={entry.code!.trim().toUpperCase()}
              demo={demo}
            />
          </div>
        ) : null,
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={safePos === 0}
          onClick={() => go(safePos - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          {t("phone.previous")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={safePos === total - 1}
          onClick={() => go(safePos + 1)}
        >
          {t("phone.next")}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
