import { SOURCE_URL_TTL_SECONDS } from "./source-image";

/** What the review screen can show as the original bill. */
export type SourceFile =
  | { kind: "image"; url: string }
  | { kind: "pdf"; url: string }
  | { kind: "unavailable" };

/** The slice of the user-scoped Supabase client this needs, injected for testing. */
export interface SourceFileStore {
  findBillFile(
    billId: string,
    userId: string,
  ): Promise<{ storagePath: string; mimeType: string | null } | null>;
  signUrl(storagePath: string, expiresInSeconds: number): Promise<string | null>;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Creates a short-lived signed URL for the caller's own bill file.
 *
 * Ownership is checked twice: the lookup is filtered to the caller's user id
 * (on top of RLS), and the stored path must sit under {user_id}/{bill_id}/.
 * The URL is built per request and must never be cached or persisted.
 */
export async function loadSourceFile(
  store: SourceFileStore,
  userId: string,
  billId: string,
): Promise<SourceFile> {
  try {
    const file = await store.findBillFile(billId, userId);
    if (!file) return { kind: "unavailable" };
    if (!file.storagePath.startsWith(`${userId}/${billId}/`)) return { kind: "unavailable" };

    const isPdf = file.mimeType === "application/pdf";
    const isImage = file.mimeType !== null && IMAGE_TYPES.has(file.mimeType);
    if (!isPdf && !isImage) return { kind: "unavailable" };

    const url = await store.signUrl(file.storagePath, SOURCE_URL_TTL_SECONDS);
    if (!url) return { kind: "unavailable" };
    return isPdf ? { kind: "pdf", url } : { kind: "image", url };
  } catch {
    return { kind: "unavailable" };
  }
}
