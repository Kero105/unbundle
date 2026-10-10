import { pdf } from "@react-pdf/renderer";
import type { LetterContent } from "./letter-content";
import { LetterPdf } from "./letter-pdf";

/**
 * Renders one PDF from already-composed content. Nothing is cached here: each
 * call builds a fresh document from the `content` it is given.
 */
export async function renderLetterPdf(content: LetterContent): Promise<Blob> {
  return pdf(<LetterPdf content={content} />).toBlob();
}
