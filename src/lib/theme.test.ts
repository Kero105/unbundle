import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import {
  applyThemeChoice,
  choiceFromAttribute,
  parseThemeChoice,
  readStoredChoice,
  resolveTheme,
  storeChoice,
  THEME_CHOICES,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  themeAttribute,
} from "./theme";

describe("parseThemeChoice", () => {
  it("accepts only light and dark as saved choices", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
  });

  it("treats everything else as System, including the word system itself", () => {
    for (const raw of [null, undefined, "", "system", "DARK", "auto", "dark ", 1, {}, ["dark"]]) {
      expect(parseThemeChoice(raw)).toBe("system");
    }
  });
});

describe("resolveTheme", () => {
  it("follows the system only when there is no explicit choice", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("lets an explicit choice win over the system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("covers every choice", () => {
    expect([...THEME_CHOICES]).toEqual(["system", "light", "dark"]);
  });
});

describe("attribute", () => {
  it("is absent for System and the choice otherwise", () => {
    expect(themeAttribute("system")).toBeNull();
    expect(themeAttribute("light")).toBe("light");
    expect(themeAttribute("dark")).toBe("dark");
  });

  it("round-trips through the document attribute", () => {
    const attrs = new Map<string, string>();
    const root = {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
    };
    applyThemeChoice(root, "dark");
    expect(choiceFromAttribute(attrs.get("data-theme") ?? null)).toBe("dark");
    applyThemeChoice(root, "light");
    expect(choiceFromAttribute(attrs.get("data-theme") ?? null)).toBe("light");
    applyThemeChoice(root, "system");
    expect(attrs.has("data-theme")).toBe(false);
    expect(choiceFromAttribute(null)).toBe("system");
  });
});

describe("storage", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
  };

  it("saves light and dark under one key, and removes the key for System", () => {
    const s = memory();
    expect(storeChoice(() => s, "dark")).toBe(true);
    expect(s.data.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredChoice(() => s)).toBe("dark");
    expect(storeChoice(() => s, "system")).toBe(true);
    expect(s.data.size).toBe(0);
    expect(readStoredChoice(() => s)).toBe("system");
  });

  it("stores nothing but the theme", () => {
    const s = memory();
    storeChoice(() => s, "light");
    expect([...s.data.keys()]).toEqual([THEME_STORAGE_KEY]);
  });

  it("falls back quietly when storage throws or is missing", () => {
    const blocked = () => {
      throw new DOMException("denied", "SecurityError");
    };
    expect(readStoredChoice(blocked)).toBe("system");
    expect(storeChoice(blocked, "dark")).toBe(false);

    const failing = {
      getItem: vi.fn(() => {
        throw new Error("boom");
      }),
      setItem: vi.fn(() => {
        throw new Error("quota");
      }),
      removeItem: vi.fn(),
    };
    expect(readStoredChoice(() => failing)).toBe("system");
    expect(storeChoice(() => failing, "light")).toBe(false);
  });
});

describe("pre-paint script", () => {
  function run(localStorage: unknown) {
    const set = vi.fn();
    vm.runInNewContext(THEME_INIT_SCRIPT, {
      localStorage,
      document: { documentElement: { setAttribute: set } },
    });
    return set;
  }

  it("applies a saved dark or light choice", () => {
    expect(run({ getItem: () => "dark" })).toHaveBeenCalledWith("data-theme", "dark");
    expect(run({ getItem: () => "light" })).toHaveBeenCalledWith("data-theme", "light");
  });

  it("reads the same key the toggle writes", () => {
    const getItem = vi.fn(() => null);
    run({ getItem });
    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
  });

  it("does nothing for no choice, junk values or other strings, so nothing unexpected reaches the DOM", () => {
    for (const value of [null, "system", "", "red", "<script>"]) {
      expect(run({ getItem: () => value })).not.toHaveBeenCalled();
    }
  });

  it("does not throw when storage throws or does not exist", () => {
    expect(() =>
      run({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
    const set = vi.fn();
    expect(() =>
      vm.runInNewContext(THEME_INIT_SCRIPT, { document: { documentElement: { setAttribute: set } } }),
    ).not.toThrow();
    expect(set).not.toHaveBeenCalled();
  });

  it("is inline-safe: no closing script tag and no template markers", () => {
    expect(THEME_INIT_SCRIPT).not.toMatch(/<\/script|<!--|\$\{/i);
  });
});
