import { PDFParse } from "pdf-parse";

const MIN_TEXT_LENGTH = 50;

interface PdfParseResult {
  text: string;
  pageCount: number;
  isScannedImage: boolean;
}

/**
 * Extract text from a PDF buffer using pdf-parse v2.
 * Detects scanned/image-only PDFs by checking extracted text length.
 */
export async function extractTextFromPdf(
  buffer: Buffer,
): Promise<PdfParseResult> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await pdf.getText();
    const text = result.text.trim();
    const isScannedImage = text.length < MIN_TEXT_LENGTH;

    return {
      text,
      pageCount: result.total,
      isScannedImage,
    };
  } finally {
    await pdf.destroy();
  }
}
