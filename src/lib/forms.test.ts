import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(rel);
    return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [rel] : [];
  });
}

/** Every <form ...> opening tag in a file, read to its closing `>` outside braces. */
function formTags(text: string): { tag: string; end: number }[] {
  const tags: { tag: string; end: number }[] = [];
  for (const m of text.matchAll(/<form\b/g)) {
    let depth = 0;
    let i = m.index!;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0 && text[i - 1] !== "=") break;
    }
    tags.push({ tag: text.slice(m.index!, i + 1), end: i });
  }
  return tags;
}

const files = sourceFiles("src").filter((f) => fs.readFileSync(path.join(root, f), "utf8").includes("<form"));

describe("forms never submit natively into the address bar", () => {
  it("finds the forms this test is about", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it("gives every form an action or method=\"dialog\"", () => {
    const problems: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      for (const { tag } of formTags(text)) {
        const hasAction = /\baction=\{/.test(tag);
        const dialog = /\bmethod="dialog"/.test(tag);
        if (!hasAction && !dialog) problems.push(`${file}: <form> without action or method="dialog"`);
        // A real POST or GET method would put the fields on the wire.
        if (/\bmethod="(get|post)"/i.test(tag)) problems.push(`${file}: <form> with an explicit GET or POST method`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("detaches every named control in a client-only form, so nothing is serialized", () => {
    const problems: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      // Only client-only forms (method="dialog"); server-action forms are meant to submit.
      if (!formTags(text).some(({ tag }) => /\bmethod="dialog"/.test(tag))) continue;
      for (const m of text.matchAll(/<input\b[^>]*?\bname=[^>]*>/g)) {
        if (!/\bform=\{/.test(m[0])) problems.push(`${file}: named <input> without a detaching form attribute`);
      }
      for (const m of text.matchAll(/<(select|textarea)\b[^>]*?\bname=[^>]*>/g)) {
        if (!/\bform=\{/.test(m[0])) problems.push(`${file}: named <${m[1]}> without a detaching form attribute`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps the sign-out form a server action with no fields", () => {
    const header = fs.readFileSync(path.join(root, "src/components/site-header.tsx"), "utf8");
    const [{ tag }] = formTags(header);
    expect(tag).toContain("action={signOut}");
  });
});
