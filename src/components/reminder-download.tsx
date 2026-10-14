"use client";

import { useId, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GFE_DISPUTE_WINDOW_DAYS } from "@/lib/assistance";
import { addDays, buildIcs } from "@/lib/calendar/ics";

interface ReminderDownloadProps {
  /** `followUp` uses the date as picked; `gfe` adds the 120-day window to a bill date. */
  mode: "followUp" | "gfe";
  labels: {
    heading: string;
    dateLabel: string;
    download: string;
    summary: string;
    description: string;
    invalidDate: string;
    note?: string;
  };
}

/** Compact UTC stamp (YYYYMMDDTHHMMSSZ) from the browser clock, read on click only. */
function utcStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * Builds the .ics in the browser and hands it to the download. The date lives in
 * this component's state only: no storage, no network, no logging, and the file
 * never contains bill details.
 */
export function ReminderDownload({ mode, labels }: ReminderDownloadProps) {
  const id = useId();
  const [date, setDate] = useState("");
  const [invalid, setInvalid] = useState(false);

  function download() {
    const eventDate = mode === "gfe" ? addDays(date, GFE_DISPUTE_WINDOW_DAYS) : date;
    const ics = eventDate
      ? buildIcs({
          date: eventDate,
          summary: labels.summary,
          description: labels.description,
          uid: `${crypto.randomUUID()}@unbundle`,
          stamp: utcStamp(),
        })
      : null;
    if (ics === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);

    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "unbundle-reminder.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h3 className="text-lg font-semibold">{labels.heading}</h3>
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{labels.dateLabel}</Label>
        <Input
          id={id}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="max-w-xs"
        />
        {invalid ? (
          <p id={`${id}-error`} className="text-sm font-medium text-destructive">
            {labels.invalidDate}
          </p>
        ) : null}
        {labels.note ? <p className="text-sm text-muted-foreground">{labels.note}</p> : null}
      </div>
      <div>
        <Button type="button" variant="outline" onClick={download}>
          <CalendarPlus aria-hidden="true" />
          {labels.download}
        </Button>
      </div>
    </div>
  );
}
