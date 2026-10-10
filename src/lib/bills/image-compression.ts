/**
 * Pure sizing and file-kind logic for client-side image compression. No DOM,
 * no network: the browser-facing wrapper lives in `compress-image.ts`.
 *
 * Filenames and byte sizes passed through here must never be logged.
 */

const MB = 1024 * 1024;

/** Final images must come in under this. */
export const TARGET_IMAGE_BYTES = 3.5 * MB;
/** PDFs are uploaded as-is, so we refuse the ones that are too big. */
export const MAX_PDF_BYTES = 4 * MB;

export const MAX_LONG_SIDE = 2400;
export const MIN_LONG_SIDE = 1600;
/** Longest-side steps tried in order once lowering quality is not enough. */
export const LONG_SIDE_STEPS = [2400, 2100, 1800, 1600] as const;
/** JPEG quality steps, tried in order at each size. */
export const QUALITY_STEPS = [0.85, 0.78, 0.7, 0.6] as const;

export type FileKind = "jpeg" | "png" | "webp" | "heic" | "pdf";

export type ClientFileErrorCode =
  | "empty"
  | "unsupported_type"
  | "pdf_too_large"
  | "image_unreadable"
  | "heic_unsupported"
  | "image_too_large";

/** Codes the upload route returns that belong to one specific file. */
export const SERVER_FILE_ERROR_CODES = [
  "empty",
  "too_large",
  "unsupported_type",
  "pdf_unreadable",
  "pdf_encrypted",
  "pdf_too_many_pages",
] as const;

export function isServerFileError(code: string): boolean {
  return (SERVER_FILE_ERROR_CODES as readonly string[]).includes(code);
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((b, i) => bytes[offset + i] === b);

const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];

/** Identifies a file from its first bytes. Returns null when unrecognized. */
export function sniffFileKind(head: Uint8Array): FileKind | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "webp";
  }
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  // ISO base media: 4-byte size, "ftyp", then a 4-character brand.
  if (startsWith(head, [0x66, 0x74, 0x79, 0x70], 4) && head.length >= 12) {
    const brand = String.fromCharCode(head[8], head[9], head[10], head[11]);
    if (HEIC_BRANDS.includes(brand)) return "heic";
  }
  return null;
}

const MIME_KINDS: Record<string, FileKind> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/heic-sequence": "heic",
  "image/heif-sequence": "heic",
  "application/pdf": "pdf",
};

const EXTENSION_KINDS: Record<string, FileKind> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  heic: "heic",
  heif: "heic",
  pdf: "pdf",
};

/**
 * Decides what a picked file is. Leading bytes win, then the MIME type, then
 * the extension (some browsers report an empty type for HEIC).
 */
export function detectFileKind(input: {
  type: string;
  name: string;
  head?: Uint8Array;
}): FileKind | null {
  if (input.head) {
    const sniffed = sniffFileKind(input.head);
    if (sniffed) return sniffed;
  }
  const byMime = MIME_KINDS[input.type.toLowerCase()];
  if (byMime) return byMime;
  const dot = input.name.lastIndexOf(".");
  if (dot < 0) return null;
  return EXTENSION_KINDS[input.name.slice(dot + 1).toLowerCase()] ?? null;
}

export const isImageKind = (kind: FileKind) => kind !== "pdf";

/** Checks a picked file before any work is done on it. */
export function checkPickedFile(kind: FileKind | null, size: number): ClientFileErrorCode | null {
  if (size <= 0) return "empty";
  if (!kind) return "unsupported_type";
  if (kind === "pdf" && size > MAX_PDF_BYTES) return "pdf_too_large";
  return null;
}

export type Dimensions = { width: number; height: number };

/** Scales so the longest side is at most `maxSide`. Never scales up. */
export function targetDimensions(width: number, height: number, maxSide: number): Dimensions | null {
  if (![width, height, maxSide].every((n) => Number.isFinite(n) && n > 0)) return null;
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type EncodeAttempt = Dimensions & { quality: number };

/**
 * The ordered encodes to try: every quality step at the largest size first,
 * then every quality step at each smaller size down to the floor. Sizes that
 * collapse to the same pixel dimensions (small images) are tried once.
 */
export function planAttempts(width: number, height: number): EncodeAttempt[] {
  const attempts: EncodeAttempt[] = [];
  let lastKey = "";
  for (const side of LONG_SIDE_STEPS) {
    const dims = targetDimensions(width, height, side);
    if (!dims) return [];
    const key = `${dims.width}x${dims.height}`;
    if (key === lastKey) continue;
    lastKey = key;
    for (const quality of QUALITY_STEPS) attempts.push({ ...dims, quality });
  }
  return attempts;
}

export const fitsTarget = (bytes: number) => bytes > 0 && bytes <= TARGET_IMAGE_BYTES;

/** "4.2 MB", "850 KB". Locale only changes the decimal separator. */
export function formatBytes(bytes: number, locale = "en"): string {
  const safe = Math.max(0, bytes);
  if (safe >= MB) {
    const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(
      safe / MB,
    );
    return `${value} MB`;
  }
  const kb = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.max(1, Math.round(safe / 1024)));
  return `${kb} KB`;
}

/** Name for the re-encoded file: same base name, `.jpg` extension. */
export function jpegFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base || "photo"}.jpg`;
}
