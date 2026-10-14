import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { LOCALE_COOKIE, localeCookie } from "@/i18n/locale";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const root = path.resolve(__dirname, "../../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

/** Every non-test source file under src. */
function sources(dir = "src"): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return sources(rel);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [rel] : [];
  });
}

describe("/privacy discloses cookies and browser storage", () => {
  const text = (m: typeof en | typeof es) => Object.values(m.Privacy.cookies).join("\n");

  it("has the section, with all four points, in both languages", () => {
    for (const m of [en, es]) {
      expect(Object.keys(m.Privacy.cookies).sort()).toEqual(["language", "none", "signin", "theme", "title"]);
      for (const value of Object.values(m.Privacy.cookies)) expect(value.length).toBeGreaterThan(0);
    }
  });

  it("renders every point on the page and in the summary", () => {
    const page = read("src/app/privacy/page.tsx");
    for (const key of ["title", "language", "signin", "theme", "none"]) {
      expect(page, key).toContain(`t("cookies.${key}")`);
    }
    expect(page).toContain('"storage"] as const');
    expect(en.Privacy.summary.storage.length).toBeGreaterThan(0);
    expect(es.Privacy.summary.storage.length).toBeGreaterThan(0);
  });

  it("names the language cookie and the theme key, and says no analytics or tracking", () => {
    for (const m of [en, es]) {
      expect(text(m)).toContain(LOCALE_COOKIE);
      expect(text(m)).toContain(THEME_STORAGE_KEY);
    }
    expect(text(en)).toMatch(/cookie/i);
    expect(text(en)).toMatch(/local storage/i);
    expect(text(en)).toContain("analytics, advertising or tracking cookies");
    expect(text(es)).toMatch(/cookie/i);
    expect(text(es)).toMatch(/almacenamiento local/i);
    expect(text(es)).toContain("cookies de análisis, publicidad ni seguimiento");
  });

  it("is repeated, not contradicted, in the FAQ and Help answers", () => {
    // Both render Privacy.summary through PrivacyAnswer, which includes the storage line.
    expect(read("src/components/privacy-answer.tsx")).toContain("FAQ_PRIVACY_KEYS");
    expect(read("src/lib/content/faq.ts")).toMatch(/FAQ_PRIVACY_KEYS = \[[^\]]*"storage"/);
    expect(read("README.md")).toContain("NEXT_LOCALE");
    expect(read("README.md")).toContain("unbundle-theme");
  });
});

describe("what the page says matches what the code does", () => {
  it("the language cookie holds a locale, lasts one year, and is Lax", () => {
    const cookie = localeCookie("es");
    expect(cookie).toContain("NEXT_LOCALE=es");
    expect(cookie).toContain(`max-age=${60 * 60 * 24 * 365}`);
    expect(cookie).toContain("samesite=lax");
    expect(en.Privacy.cookies.language).toMatch(/one year/);
    expect(es.Privacy.cookies.language).toMatch(/un año/);
  });

  it("the sign-in cookies keep the library default of 400 days, which the text states", () => {
    const defaults = read("node_modules/@supabase/ssr/dist/main/utils/constants.js");
    expect(defaults).toMatch(/maxAge:\s*400 \* 24 \* 60 \* 60/);
    expect(en.Privacy.cookies.signin).toContain("400 days");
    expect(es.Privacy.cookies.signin).toContain("400 días");
    // We do not override the lifetime anywhere.
    for (const file of sources()) {
      expect(read(file), file).not.toMatch(/cookieOptions|maxAge/);
    }
  });

  it("only the known places write cookies or browser storage", () => {
    const writers = {
      cookie: [] as string[],
      storage: [] as string[],
    };
    for (const file of sources()) {
      const text = read(file);
      if (/document\.cookie\s*=(?!=)/.test(text)) writers.cookie.push(file);
      if (/(localStorage|sessionStorage)\.(setItem|removeItem)|window\.localStorage|indexedDB/.test(text)) {
        writers.storage.push(file);
      }
    }
    // The language switch, and the theme toggle. Anything new must be disclosed
    // on /privacy first, then added here.
    expect(writers.cookie.sort()).toEqual(["src/components/language-toggle.tsx"]);
    expect(writers.storage.sort()).toEqual(["src/components/theme-toggle.tsx"]);
  });

  it("the server sets cookies only through the Supabase session helpers", () => {
    const setters = sources().filter((f) => /\.cookies\.set\(|cookieStore\.set\(|cookies\(\)\.set\(/.test(read(f)));
    expect(setters.sort()).toEqual(["src/lib/supabase/proxy.ts", "src/lib/supabase/server.ts"]);
  });

  it("has no analytics, advertising or tracking dependency or script", () => {
    const pkg = JSON.parse(read("package.json"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const banned =
      /analytics|gtag|google-tag|segment|plausible|posthog|mixpanel|amplitude|hotjar|fullstory|sentry|datadog|logrocket|clarity|pixel|adsense|speed-insights/i;
    expect(deps.filter((d) => banned.test(d))).toEqual([]);
    for (const file of sources()) {
      expect(read(file), file).not.toMatch(
        /googletagmanager|google-analytics|doubleclick|facebook\.net|hotjar|plausible\.io|posthog|segment\.com|<Script[^>]*src=/i,
      );
    }
    // Everything the page may connect to is this site and Supabase.
    const config = read("next.config.ts");
    expect(config).toContain("default-src 'self'");
    expect(config).toMatch(/script-src 'self' 'unsafe-inline'/);
  });
});
