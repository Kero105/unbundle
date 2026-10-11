"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAccountAction, deleteAllBillsAction, type SettingsActionResult } from "./actions";

type Kind = "bills" | "account";

/** Two destructive actions, each behind its own confirm dialog. */
export function DangerZone() {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [open, setOpen] = useState<Kind | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm(kind: Kind) {
    setFailed(false);
    startTransition(async () => {
      let result: SettingsActionResult;
      try {
        result = kind === "bills" ? await deleteAllBillsAction() : await deleteAccountAction();
      } catch (error) {
        // A successful account deletion redirects, which the framework signals by throwing.
        if (kind === "account" && error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        result = { ok: false, error: "failed" };
      }
      if (result.ok) {
        setOpen(null);
        if (kind === "bills") {
          setDone(true);
          router.refresh();
        }
      } else {
        setFailed(true);
      }
    });
  }

  const kind = open;
  return (
    <div className="flex flex-col gap-6">
      {done ? (
        <p role="status" className="font-medium text-success-foreground">
          {t("data.billsDeleted")}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">{t("data.billsTitle")}</h3>
        <p className="max-w-2xl text-muted-foreground">{t("data.billsBody")}</p>
        <div>
          <Button type="button" variant="outline" onClick={() => { setFailed(false); setDone(false); setOpen("bills"); }}>
            <Trash2 aria-hidden="true" />
            {t("data.billsButton")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">{t("data.accountTitle")}</h3>
        <p className="max-w-2xl text-muted-foreground">{t("data.accountBody")}</p>
        <div>
          <Button type="button" variant="destructive" onClick={() => { setFailed(false); setDone(false); setOpen("account"); }}>
            <Trash2 aria-hidden="true" />
            {t("data.accountButton")}
          </Button>
        </div>
      </div>

      <Dialog open={kind !== null} onOpenChange={(next) => !pending && setOpen(next ? kind : null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{kind === "account" ? t("confirm.accountTitle") : t("confirm.billsTitle")}</DialogTitle>
            <DialogDescription>
              {kind === "account" ? t("confirm.accountBody") : t("confirm.billsBody")}
            </DialogDescription>
          </DialogHeader>
          {failed ? (
            <p role="alert" className="text-destructive">
              {kind === "account" ? t("confirm.accountError") : t("confirm.billsError")}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(null)}>
              {t("confirm.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => kind && confirm(kind)}
            >
              {pending ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
              {pending
                ? t("confirm.pending")
                : kind === "account"
                  ? t("confirm.accountConfirm")
                  : t("confirm.billsConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
