import { cn } from "cn"

type ProgressProps = Omit<React.ComponentProps<"div">, "children"> & {
  value: number
  max: number
  /** Accessible name for the bar. */
  label: string
  /** Human-readable value, e.g. "2 of 5 rows verified". */
  valueText: string
}

/** Determinate progress bar. The fill uses the green "verified" color. */
function Progress({
  value,
  max,
  label,
  valueText,
  className,
  ...props
}: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn("h-3 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-success transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export { Progress }
