/** Routes that require a signed-in user. Everything else is public. */
export const PROTECTED_ROUTE = /^\/(dashboard|bills)(\/|$)/;

/**
 * The sample-bill flow. Public on purpose: it reads only bundled synthetic
 * data and never touches the database, the Anthropic API, or the service role.
 */
export const DEMO_ROUTE = /^\/demo(\/|$)/;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE.test(pathname);
}

export function isPublicDemoPath(pathname: string): boolean {
  return DEMO_ROUTE.test(pathname);
}
