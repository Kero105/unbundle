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
import { deleteBillAction } from "@/app/bills/actions";

/** Confirm-then-delete. Removes the rows and the stored files, then goes to the dashboard. */
export function DeleteBillButton({ billId, size = "default" }: { billId: string; size?: "default" | "sm" }) {
  const t = useTranslations("DeleteBill");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setFailed(false);
    startTransition(async () => {
      const result = await deleteBillAction(billId);
      if (result.ok) {
        setOpen(false);
        router.push("/dashboard");
        router.refresh();
      } else {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" />
        {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          {failed ? (
            <p role="alert" className="text-destructive">
              {t("error")}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>
              {pending ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
              {pending ? t("confirmPending") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
