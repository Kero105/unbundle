import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Tolerant .env.local reader (allows spaces around "="). Values are never printed. */
function readEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

/** Service-role client. Local use only: refuses to run in CI. */
export function serviceClient() {
  if (process.env.CI) throw new Error("Import scripts are local-only; refusing to run in CI.");
  const env = readEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  // Guard against pasting the anon key into the service-role slot.
  if (key.startsWith("eyJ")) {
    const role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
    if (role !== "service_role") throw new Error("SUPABASE_SERVICE_ROLE_KEY is not a service_role key");
  } else if (!key.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY has an unrecognized format");
  }
  console.log(`Target: ${new URL(url).host}`);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
