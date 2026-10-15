"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ParseResult } from "@/app/bills/[id]/review/fields";

export type FieldInputProps<T> = {
  value: T;
  format: (value: T) => string;
  parse: (text: string) => ParseResult<T>;
  onCommit: (value: T) => void;
  label: string;
  /** Short visible label, shown in the stacked mobile layout only. */
  visibleLabel: string;
  error: string;
  type?: "text" | "date";
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  className?: string;
  /** Keep the visible label at every width (the review table hides it on desktop). */
  alwaysShowLabel?: boolean;
};

/**
 * Text input that keeps its own draft and commits only a valid parse on blur
 * or Enter. An invalid draft stays on screen, flagged, and never reaches state.
 */
export function FieldInput<T>({
  value,
  format,
  parse,
  onCommit,
  label,
  visibleLabel,
  error,
  type = "text",
  inputMode,
  placeholder,
  className,
  alwaysShowLabel = false,
}: FieldInputProps<T>) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();
  const inputId = useId();
  const [focused, setFocused] = useState(false);
  const shown = draft ?? format(value);
  // An empty native date input shows "mm/dd/yyyy" and can't be relabeled, so
  // while it is empty and unfocused it is a text input showing our placeholder.
  const effectiveType = type === "date" && shown === "" && !focused ? "text" : type;

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
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={inputId}
        className={cn(
          "text-sm font-medium text-muted-foreground",
          !alwaysShowLabel && "lg:sr-only",
        )}
      >
        {visibleLabel}
      </label>
      <Input
        id={inputId}
        type={effectiveType}
        inputMode={inputMode}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        placeholder={placeholder}
        className={className}
        value={shown}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {invalid ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
