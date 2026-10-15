import "server-only";
import { BILLS_BUCKET } from "@/lib/extraction/supabase-store";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { loadSourceFile, type SourceFile } from "./source-file";

/**
 * Signed URL for the signed-in user's own bill file, created with the
 * user-scoped client (never the service role). Not cached: the caller renders
 * this per request, and the URL is neither logged nor stored.
 */
export async function getSourceFileForBill(billId: string): Promise<SourceFile> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { kind: "unavailable" };

  return loadSourceFile(
    {
      async findBillFile(id, userId) {
        const { data, error } = await supabase
          .from("bill_files")
          .select("storage_path, mime_type")
          .eq("bill_id", id)
          .eq("user_id", userId)
          .eq("kind", "bill")
          .maybeSingle();
        if (error || !data) return null;
        return { storagePath: data.storage_path, mimeType: data.mime_type };
      },
      async signUrl(path, expiresIn) {
        const { data, error } = await supabase.storage
          .from(BILLS_BUCKET)
          .createSignedUrl(path, expiresIn);
        return error || !data ? null : data.signedUrl;
      },
    },
    user.id,
    billId,
  );
}
