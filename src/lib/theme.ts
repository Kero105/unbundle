/**
 * Theme choice: System, Light or Dark. "System" is the absence of a choice, so
 * the stylesheet follows the OS. A choice is the one thing this site keeps in
 * localStorage, always inside try/catch: if storage is unavailable the choice
 * still applies for the page's lifetime and nothing breaks.
 */

export const THEME_STORAGE_KEY = "unbundle-theme";

export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ResolvedTheme = "light" | "dark";

/** Anything that is not a saved "light" or "dark" means no choice: System. */
export function parseThemeChoice(raw: unknown): ThemeChoice {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** The value for <html data-theme>, or null for System (no attribute). */
export function themeAttribute(choice: ThemeChoice): ResolvedTheme | null {
  return choice === "system" ? null : choice;
}

/** What the page ends up looking like. */
export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === "light" || choice === "dark") return choice;
  return systemPrefersDark ? "dark" : "light";
}

/** The choice currently applied to the document, read from its attribute. */
export function choiceFromAttribute(attribute: string | null): ThemeChoice {
  return parseThemeChoice(attribute);
}

export function applyThemeChoice(root: Pick<HTMLElement, "setAttribute" | "removeAttribute">, choice: ThemeChoice) {
  const attribute = themeAttribute(choice);
  if (attribute) root.setAttribute("data-theme", attribute);
  else root.removeAttribute("data-theme");
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The saved choice; System when nothing is saved or storage cannot be read. */
export function readStoredChoice(storage: () => StorageLike): ThemeChoice {
  try {
    return parseThemeChoice(storage().getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Saves the choice. Returns false when storage is unavailable; the caller carries on. */
export function storeChoice(storage: () => StorageLike, choice: ThemeChoice): boolean {
  try {
    const s = storage();
    if (choice === "system") s.removeItem(THEME_STORAGE_KEY);
    else s.setItem(THEME_STORAGE_KEY, choice);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs in <head> before the page paints, so a saved choice is applied with no
 * flash. Plain ES5 on purpose: it is inlined as text. It can only set the
 * attribute to "light" or "dark", and does nothing if storage throws.
 */
export const THEME_INIT_SCRIPT =
  "(function(){try{var t=localStorage.getItem(" +
  JSON.stringify(THEME_STORAGE_KEY) +
  ');if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();';
