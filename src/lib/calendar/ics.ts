/**
 * Minimal iCalendar (.ics) builder for a single all-day reminder.
 *
 * Pure: no clock, no randomness, no network, no storage. The caller supplies
 * the event date, a UID and a timestamp. Nothing about a bill goes in; the
 * summary and description are fixed generic strings chosen by the caller.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Epoch day number for a real calendar date (YYYY-MM-DD), or null if invalid. */
function toDayNumber(value: string): number | null {
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return Math.round(ms / 86_400_000);
}

function fromDayNumber(day: number): string {
  const d = new Date(day * 86_400_000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** `date` plus a whole number of calendar days, or null when `date` is not a real date. */
export function addDays(date: string, days: number): string | null {
  const day = toDayNumber(date);
  if (day === null || !Number.isSafeInteger(days)) return null;
  return fromDayNumber(day + days);
}

/** Escapes TEXT values per RFC 5545: backslash, semicolon, comma, newline. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets with CRLF + space continuations. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const bytes = encoder.encode(ch).length;
    // Continuation lines start with a space, which counts toward their 75 octets.
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export interface IcsEvent {
  /** ISO date YYYY-MM-DD for the all-day event. */
  date: string;
  summary: string;
  description: string;
  /** Unique id supplied by the caller (the builder never generates one). */
  uid: string;
  /** UTC timestamp, YYYYMMDDTHHMMSSZ, supplied by the caller. */
  stamp: string;
}

const STAMP = /^\d{8}T\d{6}Z$/;

/** CRLF-delimited VCALENDAR text, or null when the date or stamp is not valid. */
export function buildIcs(event: IcsEvent): string | null {
  const day = toDayNumber(event.date);
  if (day === null || !STAMP.test(event.stamp) || event.uid.trim() === "") return null;

  const compact = (iso: string) => iso.replace(/-/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Unbundle//Reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${event.stamp}`,
    `DTSTART;VALUE=DATE:${compact(event.date)}`,
    `DTEND;VALUE=DATE:${compact(fromDayNumber(day + 1))}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
