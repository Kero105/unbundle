import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BILLS_BUCKET } from "@/lib/extraction/supabase-store";
import { MAX_FILE_BYTES, validateUpload } from "@/lib/bills/upload-validation";
import { createClient } from "@/lib/supabase/server";

const KindSchema = z.enum(["bill", "eob"]);
const UNIQUE_VIOLATION = "23505";

// A multipart body adds a little overhead on top of the file itself.
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Stores one file (the bill or its EOB) for a bill the caller owns. Type is
 * decided here from the file's magic bytes, size and PDF page count are
 * enforced here, and the object is written through the user-scoped client, so
 * the storage policy also pins it to {user_id}/ .
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/bills/[id]/files">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("not_found", 404);

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("too_large", 413);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthenticated", 401);

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, extraction_status")
    .eq("id", id)
    .maybeSingle();
  if (billError) return fail("upload_failed", 500);
  if (!bill) return fail("not_found", 404);
  if (bill.extraction_status === "needs_review" || bill.extraction_status === "extracting") {
    return fail("bill_locked", 409);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("unsupported_type", 400);
  }
  const kind = KindSchema.safeParse(form.get("kind"));
  const file = form.get("file");
  if (!kind.success || !(file instanceof File)) return fail("unsupported_type", 400);
  if (file.size > MAX_FILE_BYTES) return fail("too_large", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = await validateUpload(bytes);
  if (!checked.ok) {
    return fail(checked.code, checked.code === "too_large" ? 413 : 400);
  }

  const storagePath = `${user.id}/${id}/${randomUUID()}.${checked.extension}`;
  const upload = await supabase.storage
    .from(BILLS_BUCKET)
    .upload(storagePath, bytes, { contentType: checked.mimeType, upsert: false });
  if (upload.error) return fail("upload_failed", 500);

  const { error: rowError } = await supabase.from("bill_files").insert({
    bill_id: id,
    user_id: user.id,
    storage_path: storagePath,
    kind: kind.data,
    page_count: checked.pageCount,
    mime_type: checked.mimeType,
    size_bytes: bytes.length,
  });
  if (rowError) {
    // Don't leave an unreferenced private object behind.
    await supabase.storage.from(BILLS_BUCKET).remove([storagePath]);
    return rowError.code === UNIQUE_VIOLATION
      ? fail("already_uploaded", 409)
      : fail("upload_failed", 500);
  }

  return NextResponse.json({ ok: true, pageCount: checked.pageCount }, { status: 201 });
}
