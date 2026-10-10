import {
  fitsTarget,
  jpegFileName,
  planAttempts,
  type ClientFileErrorCode,
  type FileKind,
} from "./image-compression";

/** Thrown with an opaque code only; never carries file names or sizes. */
export class CompressError extends Error {
  constructor(readonly code: ClientFileErrorCode) {
    super(code);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Re-encodes an image as a JPEG within the size target. Browser-only. The
 * bitmap is decoded with EXIF orientation applied and the canvas re-encode
 * drops metadata (including GPS), so the result is upright and clean.
 */
export async function compressImage(file: File, kind: FileKind): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new CompressError(kind === "heic" ? "heic_unsupported" : "image_unreadable");
  }

  try {
    const attempts = planAttempts(bitmap.width, bitmap.height);
    if (attempts.length === 0) throw new CompressError("image_unreadable");

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new CompressError("image_unreadable");

    let drawn = "";
    for (const attempt of attempts) {
      const key = `${attempt.width}x${attempt.height}`;
      if (key !== drawn) {
        canvas.width = attempt.width;
        canvas.height = attempt.height;
        // JPEG has no alpha: paint white so transparent PNGs don't turn black.
        context.fillStyle = "#fff";
        context.fillRect(0, 0, attempt.width, attempt.height);
        context.imageSmoothingQuality = "high";
        context.drawImage(bitmap, 0, 0, attempt.width, attempt.height);
        drawn = key;
      }
      const blob = await toBlob(canvas, attempt.quality);
      if (!blob) throw new CompressError("image_unreadable");
      if (fitsTarget(blob.size)) {
        return new File([blob], jpegFileName(file.name), { type: "image/jpeg" });
      }
    }
    throw new CompressError("image_too_large");
  } finally {
    bitmap.close();
  }
}
