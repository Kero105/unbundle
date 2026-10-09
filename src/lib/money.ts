/**
 * Convert a dollar amount to integer cents without float error.
 * Works on the decimal string form (never `n * 100`) and rounds half away
 * from zero at the cent.
 */
export function dollarsToCents(value: string | number): number {
  let text: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError("Invalid dollar amount");
    // toFixed(10) absorbs binary noise (0.1 + 0.2) and avoids exponent notation.
    text = Math.abs(value) < 1e21 ? value.toFixed(10) : String(value);
  } else {
    text = value.trim().replace(/[$,\s]/g, "");
  }

  const match = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (!match[2] && !match[3])) {
    throw new RangeError("Invalid dollar amount");
  }
  const negative = match[1] === "-";
  const whole = match[2] || "0";
  const frac = (match[3] ?? "").padEnd(3, "0");

  let cents = Number(whole) * 100 + Number(frac.slice(0, 2));
  if (frac.charCodeAt(2) >= 53 /* '5' */) cents += 1;
  if (!Number.isSafeInteger(cents)) throw new RangeError("Amount too large");

  return negative && cents !== 0 ? -cents : cents;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** Format integer cents as `$X,XXX.XX` (negatives as `-$X,XXX.XX`). */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError("Cents must be a safe integer");
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = String(abs % 100).padStart(2, "0");
  const grouped = usd.format(dollars).slice(0, -3); // "$1,234"
  return `${cents < 0 ? "-" : ""}${grouped}.${rem}`;
}
