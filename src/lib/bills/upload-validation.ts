import { PDFDocument } from "pdf-lib";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 6;

export const UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];

const EXTENSIONS: Record<UploadMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export type UploadErrorCode =
  | "empty"
  | "too_large"
  | "unsupported_type"
  | "pdf_unreadable"
  | "pdf_encrypted"
  | "pdf_too_many_pages";

export type UploadValidation =
  | { ok: true; mimeType: UploadMimeType; extension: string; pageCount: number }
  | { ok: false; code: UploadErrorCode };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((b, i) => bytes[offset + i] === b);

/**
 * Identifies a file from its leading bytes. The filename and the
 * client-supplied Content-Type are never consulted: both are attacker-chosen.
 */
export function detectFileType(bytes: Uint8Array): UploadMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  return null;
}

/** Server-side gate for an uploaded file: size, real type, and PDF page limit. */
export async function validateUpload(bytes: Uint8Array): Promise<UploadValidation> {
  if (bytes.length === 0) return { ok: false, code: "empty" };
  if (bytes.length > MAX_FILE_BYTES) return { ok: false, code: "too_large" };

  const mimeType = detectFileType(bytes);
  if (!mimeType) return { ok: false, code: "unsupported_type" };

  if (mimeType !== "application/pdf") {
    return { ok: true, mimeType, extension: EXTENSIONS[mimeType], pageCount: 1 };
  }

  let pageCount: number;
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    pageCount = pdf.getPageCount();
  } catch (error) {
    const encrypted = error instanceof Error && error.name === "EncryptedPDFError";
    return { ok: false, code: encrypted ? "pdf_encrypted" : "pdf_unreadable" };
  }
  if (pageCount < 1) return { ok: false, code: "pdf_unreadable" };
  if (pageCount > MAX_PDF_PAGES) return { ok: false, code: "pdf_too_many_pages" };

  return { ok: true, mimeType, extension: EXTENSIONS[mimeType], pageCount };
}

export function isUploadSizeOk(size: number): boolean {
  return size > 0 && size <= MAX_FILE_BYTES;
}
