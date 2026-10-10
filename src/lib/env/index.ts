import "server-only";
import { describeIssues, validateServerEnv, type EnvValidation } from "./validate";

/** Validates process.env for the running server. Never returns values. */
export function checkServerEnv(): EnvValidation {
  return validateServerEnv(process.env, { production: process.env.NODE_ENV === "production" });
}

/** Throws with variable names only when the environment is unfit to serve users. */
export function assertServerEnv(): void {
  const result = checkServerEnv();
  if (!result.ok) throw new Error(`Invalid server environment: ${describeIssues(result.issues)}`);
}
