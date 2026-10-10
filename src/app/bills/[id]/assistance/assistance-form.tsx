"use client";

import { useMemo, useState, type ComponentProps, type FormEvent } from "react";
import { createTranslator } from "next-intl";
import { CircleCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkFinancialAssistance,
  checkGoodFaithEstimate,
  type FinancialAssistanceResult,
  type GoodFaithEstimateResult,
} from "@/lib/assistance";
import type { PovertyGuidelines } from "@/lib/assistance/poverty-data";
import { gfeDateProblem, type GfeDateProblem } from "@/lib/assistance/gfe-date-problem";
import { dollarsToCents, formatCents } from "@/lib/money";
import type { Locale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

interface AssistanceFormProps {
  uiLocale: Locale;
  messages: Record<Locale, Record<string, unknown>>;
  guidelines: PovertyGuidelines;
  /** Prefills the billed total; the user can change it. */
  initialBilledTotalCents: number;
}

type FieldError = "householdSize" | "income" | "estimateTotal" | "billedTotal" | "insurance";
type Translate = (key: string, values?: Record<string, string | number>) => string;

interface Outcome {
  year: number;
  fpl: FinancialAssistanceResult;
  gfe: GoodFaithEstimateResult | null;
  /** Which date message to show when the estimate check rejected the dates. */
  dateProblem: GfeDateProblem | null;
}

const DATE_ERROR_KEYS: Record<GfeDateProblem, string> = {
  missing: "errors.datesMissing",
  estimate_after_bill: "errors.estimateAfterBill",
  bill_in_future: "errors.billInFuture",
};

/** Dollar input with a visible $ prefix; the prefix is decoration only. */
function MoneyInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        $
      </span>
      <Input inputMode="decimal" autoComplete="off" className="pl-7" {...props} />
    </div>
  );
}

/** Local calendar date as YYYY-MM-DD; the pure checker never reads the clock. */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseMoney(value: string): number | null {
  try {
    return dollarsToCents(value);
  } catch {
    return null;
  }
}

/** Field order for moving focus to the first invalid field after submit. */
const FOCUS_ORDER: ReadonlyArray<readonly [FieldError, string]> = [
  ["householdSize", "household-size"],
  ["income", "income"],
  ["insurance", "insurance-insured"],
  ["estimateTotal", "estimate-total"],
  ["billedTotal", "billed-total"],
];

const radioClass =
  "relative size-6 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-card transition-colors outline-none hover:border-foreground/60 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background checked:border-primary checked:bg-primary checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:size-2.5 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:rounded-full checked:after:bg-primary-foreground";

/**
 * Everything typed here lives in this component's state and is computed in the
 * browser: no storage, no network, no logging.
 */
export function AssistanceForm({
  uiLocale,
  messages,
  guidelines,
  initialBilledTotalCents,
}: AssistanceFormProps) {
  const [householdSize, setHouseholdSize] = useState("");
  const [income, setIncome] = useState("");
  const [insurance, setInsurance] = useState<"" | "insured" | "uninsured">("");
  const [estimateTotal, setEstimateTotal] = useState("");
  const [billedTotal, setBilledTotal] = useState(
    initialBilledTotalCents > 0 ? formatCents(initialBilledTotalCents).replace("$", "") : "",
  );
  const [estimateDate, setEstimateDate] = useState("");
  const [billDate, setBillDate] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  /** True once the user submitted a Good Faith Estimate comparison. */
  const [gfeSubmitted, setGfeSubmitted] = useState(false);

  const t = useMemo(
    () =>
      createTranslator({
        locale: uiLocale,
        messages: { Assistance: messages[uiLocale] },
        namespace: "Assistance",
      }),
    [uiLocale, messages],
  );
  const label: Translate = (key, values) =>
    (t as unknown as (k: string, v?: Record<string, string | number>) => string)(key, values);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: FieldError[] = [];

    const size = /^\d+$/.test(householdSize.trim()) ? Number(householdSize.trim()) : NaN;
    if (!Number.isSafeInteger(size) || size < 1) found.push("householdSize");

    const incomeCents = income.trim() === "" ? null : parseMoney(income);
    if (incomeCents === null || incomeCents < 0) found.push("income");

    if (insurance === "") found.push("insurance");

    const wantsGfe = insurance === "uninsured" && estimateTotal.trim() !== "";
    const estimateCents = wantsGfe ? parseMoney(estimateTotal) : null;
    const billedCents = wantsGfe ? parseMoney(billedTotal) : null;
    if (wantsGfe) {
      if (estimateCents === null || estimateCents < 0) found.push("estimateTotal");
      if (billedCents === null || billedCents < 0) found.push("billedTotal");
    }

    setErrors(found);
    setGfeSubmitted(wantsGfe);
    if (found.length > 0 || incomeCents === null) {
      setOutcome(null);
      const firstId = FOCUS_ORDER.find(([field]) => found.includes(field))?.[1];
      if (firstId) document.getElementById(firstId)?.focus();
      return;
    }

    const fpl = checkFinancialAssistance(
      {
        householdSize: size,
        annualIncomeCents: incomeCents,
        guidelineYear: guidelines.guidelineYear,
        region: "contiguous", // California uses the contiguous-US guidelines.
      },
      guidelines.rows,
    );

    const gfe =
      wantsGfe && estimateCents !== null && billedCents !== null
        ? checkGoodFaithEstimate({
            estimateTotalCents: estimateCents,
            billedTotalCents: billedCents,
            estimateDate,
            billDate,
            today: localToday(),
          })
        : null;

    const dateProblem =
      gfe && !gfe.ok && gfe.error === "invalid_dates"
        ? (gfeDateProblem(estimateDate, billDate, localToday()) ?? "missing")
        : null;

    setOutcome({ year: guidelines.guidelineYear, fpl, gfe, dateProblem });
  }

  // No date message until both dates are filled in; "missing" only shows after
  // the user tried to compare with a date left empty.
  const datesFilled = estimateDate !== "" && billDate !== "";
  const dateProblem: GfeDateProblem | null = datesFilled
    ? gfeDateProblem(estimateDate, billDate, localToday())
    : gfeSubmitted
      ? "missing"
      : null;
  const estimateDateError =
    dateProblem === "estimate_after_bill" || (dateProblem === "missing" && estimateDate === "")
      ? dateProblem
      : null;
  const billDateError =
    dateProblem === "bill_in_future" || (dateProblem === "missing" && billDate === "")
      ? dateProblem
      : null;

  const invalid = (field: FieldError, id: string, hasHint = false) => ({
    id,
    "aria-invalid": errors.includes(field) || undefined,
    "aria-describedby":
      [hasHint ? `${id}-hint` : null, errors.includes(field) ? `${id}-error` : null]
        .filter(Boolean)
        .join(" ") || undefined,
  });
  const fieldError = (field: FieldError, id: string) =>
    errors.includes(field) ? (
      <p id={`${id}-error`} className="text-sm font-medium text-destructive">
        {label(`errors.${field}`)}
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="estimate-notice"
        className="flex gap-3 rounded-xl border bg-card p-4"
      >
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <h2 id="estimate-notice" className="font-semibold">
            {label("estimateNotice.title")}
          </h2>
          <p className="text-muted-foreground">{label("estimateNotice.body")}</p>
        </div>
      </section>

      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5 rounded-xl border bg-card p-6"
      >
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-1 text-xl font-semibold">{label("form.legend")}</legend>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="household-size">{label("form.householdSize")}</Label>
            <Input
              {...invalid("householdSize", "household-size", true)}
              inputMode="numeric"
              autoComplete="off"
              min={1}
              placeholder={label("form.householdSizePlaceholder")}
              className="sm:max-w-40"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
            />
            <p id="household-size-hint" className="text-sm text-muted-foreground">
              {label("form.householdSizeHint")}
            </p>
            {fieldError("householdSize", "household-size")}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="income">{label("form.income")}</Label>
            <MoneyInput
              {...invalid("income", "income", true)}
              placeholder={label("form.incomePlaceholder")}
              className="sm:max-w-60"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
            <p id="income-hint" className="text-sm text-muted-foreground">
              {label("form.incomeHint")}
            </p>
            {fieldError("income", "income")}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">{label("form.insurance")}</legend>
          {(["insured", "uninsured"] as const).map((value) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
              <input
                type="radio"
                id={`insurance-${value}`}
                name="insurance"
                value={value}
                checked={insurance === value}
                onChange={() => setInsurance(value)}
                className={radioClass}
              />
              {label(`form.${value}`)}
            </label>
          ))}
          {errors.includes("insurance") ? (
            <p className="text-sm font-medium text-destructive">{label("errors.insurance")}</p>
          ) : null}
        </fieldset>

        {insurance === "uninsured" ? (
          <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
            <legend className="px-1 font-medium">{label("form.gfeLegend")}</legend>
            <p className="text-sm text-muted-foreground">{label("form.gfeHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimate-total">{label("form.estimateTotal")}</Label>
                <MoneyInput
                  {...invalid("estimateTotal", "estimate-total")}
                  placeholder={label("form.estimateTotalPlaceholder")}
                  value={estimateTotal}
                  onChange={(e) => setEstimateTotal(e.target.value)}
                />
                {fieldError("estimateTotal", "estimate-total")}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="billed-total">{label("form.billedTotal")}</Label>
                <MoneyInput
                  {...invalid("billedTotal", "billed-total")}
                  placeholder={label("form.billedTotalPlaceholder")}
                  value={billedTotal}
                  onChange={(e) => setBilledTotal(e.target.value)}
                />
                {fieldError("billedTotal", "billed-total")}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimate-date">{label("form.estimateDate")}</Label>
                <Input
                  id="estimate-date"
                  type="date"
                  aria-invalid={estimateDateError ? true : undefined}
                  aria-describedby={
                    estimateDateError ? "estimate-date-hint estimate-date-error" : "estimate-date-hint"
                  }
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                />
                <p id="estimate-date-hint" className="text-sm text-muted-foreground">
                  {label("form.estimateDateHint")}
                </p>
                {estimateDateError ? (
                  <p id="estimate-date-error" className="text-sm font-medium text-destructive">
                    {label(DATE_ERROR_KEYS[estimateDateError])}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bill-date">{label("form.billDate")}</Label>
                <Input
                  id="bill-date"
                  type="date"
                  aria-invalid={billDateError ? true : undefined}
                  aria-describedby={billDateError ? "bill-date-hint bill-date-error" : "bill-date-hint"}
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
                <p id="bill-date-hint" className="text-sm text-muted-foreground">
                  {label("form.billDateHint")}
                </p>
                {billDateError ? (
                  <p id="bill-date-error" className="text-sm font-medium text-destructive">
                    {label(DATE_ERROR_KEYS[billDateError])}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>
        ) : null}

        <p className="text-sm text-muted-foreground">{label("privacy")}</p>

        <div>
          <Button type="submit">{label("form.submit")}</Button>
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-6">
        {outcome ? <Results outcome={outcome} label={label} /> : null}
      </div>

      <section
        aria-labelledby="ask-title"
        className="flex flex-col gap-3 rounded-xl border bg-card p-6"
      >
        <h2 id="ask-title" className="text-xl font-semibold">
          {label("ask.title")}
        </h2>
        <p className="text-muted-foreground">{label("ask.intro")}</p>
        <ul className="flex flex-col gap-2">
          {(["application", "policy", "paymentPlan"] as const).map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CircleCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-success-foreground"
              />
              <span>{label(`ask.${item}`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Results({ outcome, label }: { outcome: Outcome; label: Translate }) {
  const { fpl, gfe } = outcome;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h2>{label("result.title")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {fpl.ok ? (
            <>
              <p className="text-2xl font-semibold">
                {label("result.percent", { percent: fpl.percentOfFpl })}
              </p>
              <p>{label(fpl.explanationKey)}</p>
              <p className="text-sm text-muted-foreground">
                {label("result.year", { year: outcome.year })}
              </p>
            </>
          ) : (
            <p role="alert" className="font-medium text-destructive">
              {label(
                fpl.error === "missing_poverty_row"
                  ? "errors.missingGuidelines"
                  : fpl.error === "invalid_income"
                    ? "errors.income"
                    : "errors.householdSize",
              )}
            </p>
          )}
          <p className="font-medium">
            {label("estimateNotice.title")}. {label("estimateNotice.body")}
          </p>
        </CardContent>
      </Card>

      {gfe ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              <h2>{label("gfe.title")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {gfe.ok ? (
              <>
                <p className="text-lg font-semibold tabular-nums">
                  {gfe.differenceCents === 0
                    ? label("gfe.differenceSame")
                    : gfe.differenceCents > 0
                      ? label("gfe.differenceOver", { amount: formatCents(gfe.differenceCents) })
                      : label("gfe.differenceUnder", { amount: formatCents(-gfe.differenceCents) })}
                </p>
                <p>{label(gfe.explanationKey)}</p>
              </>
            ) : (
              <p role="alert" className="font-medium text-destructive">
                {label(
                  gfe.error === "invalid_dates"
                    ? DATE_ERROR_KEYS[outcome.dateProblem ?? "missing"]
                    : "errors.billedTotal",
                )}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
