// Runs once when the server starts. In production a bad environment (missing
// keys, or mock extraction while real users can upload) stops the server
// instead of serving broken or fake results. Skipped during `next build`.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertServerEnv } = await import("@/lib/env");
  assertServerEnv();
}
