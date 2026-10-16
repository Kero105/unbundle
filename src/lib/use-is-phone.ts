"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `sm` breakpoint (640px): phones are everything below it.
const QUERY = "(max-width: 639.98px)";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
}

// The server (and the first client render) assume not a phone, so hydration
// matches; a phone switches right after. Width only: no device detection.
const getServerSnapshot = () => false;

export function useIsPhone() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
