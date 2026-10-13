import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { DeleteBillButton } from "@/components/delete-bill-button";
import { PendingLink } from "@/components/pending-link";
import { RetryExtractionButton } from "@/components/retry-extraction-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { displayStatus } from "@/lib/bills/extraction-status";
import { suggestsItemizedRequest, summarizeConfidence } from "@/lib/bills/extraction-confidence";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { routeMetadata } from "@/lib/metadata";

// Request-time clock for the stale-extraction check; this runs after connection().
const currentTimeMs = () => Date.now();

async function Dashboard() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [locale, t, result] = await Promise.all([
    getLocale(),
    getTranslations("Dashboard"),
    supabase
      .from("bills")
      .select("id, created_at, provider_name, service_start, total_billed_cents, extraction_status, extraction_started_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const bills = result.data ?? [];
  const now = currentTimeMs();

  // Only confidence labels are read here, never bill text.
  const readyIds = bills.filter((b) => b.extraction_status === "needs_review").map((b) => b.id);
  const rowsByBill = new Map<string, { confidence: "high" | "medium" | "low" }[]>();
  if (readyIds.length > 0) {
    const { data: rows } = await supabase
      .from("line_items")
      .select("bill_id, confidence")
      .in("bill_id", readyIds);
    for (const row of rows ?? []) {
      const list = rowsByBill.get(row.bill_id) ?? [];
      list.push({ confidence: row.confidence ?? "low" });
      rowsByBill.set(row.bill_id, list);
    }
  }

  return (
    <NextIntlClientProvider>
      <main
        lang={locale}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
            <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
            <p className="text-sm text-muted-foreground">{t("signedInAs", { email: user.email ?? "" })}</p>
          </div>
          {bills.length > 0 ? (
            <PendingLink
              href="/bills/new"
              className={buttonVariants()}
              pendingLabel={t("uploadPending")}
            >
              <Plus aria-hidden="true" />
              {t("upload")}
            </PendingLink>
          ) : null}
        </header>

        {result.error ? (
          <p role="alert" className="text-destructive">
            {t("loadError")}
          </p>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-8">
            <h2 className="text-xl font-semibold">{t("empty.title")}</h2>
            <p className="text-muted-foreground">{t("empty.body")}</p>
            <PendingLink
              href="/bills/new"
              className={buttonVariants({ size: "lg" })}
              pendingLabel={t("uploadPending")}
            >
              <Plus aria-hidden="true" />
              {t("upload")}
            </PendingLink>
          </div>
        ) : (
          <ul aria-label={t("listLabel")} className="flex flex-col gap-4">
            {bills.map((bill) => {
              const status = displayStatus(bill.extraction_status, bill.extraction_started_at, now);
              return (
                <li key={bill.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold break-words">
                            {bill.provider_name || t("providerUnknown")}
                          </h2>
                          <p className="text-muted-foreground">
                            {bill.service_start
                              ? day.format(new Date(`${bill.service_start}T00:00:00Z`))
                              : t("dateUnknown")}
                            {" · "}
                            {t("uploadedOn", { date: day.format(new Date(bill.created_at)) })}
                          </p>
                          {typeof bill.total_billed_cents === "number" ? (
                            <p className="font-medium tabular-nums">
                              {t("total", { amount: formatCents(bill.total_billed_cents) })}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={status === "needs_review" ? "success" : status === "failed" ? "warning" : "outline"}>
                          {t(`status.${status}`)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-start gap-3">
                        {status === "needs_review" ? (
                          <PendingLink
                            href={`/bills/${bill.id}/review`}
                            className={buttonVariants({ size: "sm" })}
                            pendingLabel={t("openPending")}
                          >
                            {t("open")}
                          </PendingLink>
                        ) : null}
                        {status === "needs_review" &&
                        suggestsItemizedRequest(summarizeConfidence(rowsByBill.get(bill.id) ?? [])) ? (
                          <PendingLink
                            href={`/bills/${bill.id}/letter?type=itemized`}
                            className={buttonVariants({ size: "sm", variant: "outline" })}
                            pendingLabel={t("openPending")}
                          >
                            {t("requestItemized")}
                          </PendingLink>
                        ) : null}
                        {status === "failed" ? (
                          <RetryExtractionButton billId={bill.id} />
                        ) : null}
                        {status === "failed" || status === "pending" ? (
                          <PendingLink
                            href={`/bills/${bill.id}/enter`}
                            className={buttonVariants({ size: "sm", variant: "outline" })}
                            pendingLabel={t("openPending")}
                          >
                            {t("enterByHand")}
                          </PendingLink>
                        ) : null}
                        <DeleteBillButton billId={bill.id} size="sm" />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </NextIntlClientProvider>
  );
}

function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12"
    >
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-7 w-72" />
      <Skeleton className="h-32 w-full" />
    </main>
  );
}

export const generateMetadata = () => routeMetadata("dashboard");

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
