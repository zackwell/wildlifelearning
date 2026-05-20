function extOf(fileName: string): string {
  const m = fileName.match(/(\.[^.]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeExtractedText(String(result.text ?? ""));
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return normalizeExtractedText(String(result.value ?? ""));
}

async function extractDocText(buffer: Buffer): Promise<string> {
  const { default: WordExtractor } = await import("word-extractor");
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return normalizeExtractedText(doc.getBody());
}

function extractPlainText(buffer: Buffer): string {
  return normalizeExtractedText(buffer.toString("utf8"));
}

export async function extractLiteratureText(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = extOf(fileName);
  switch (ext) {
    case ".pdf":
      return extractPdfText(buffer);
    case ".docx":
      return extractDocxText(buffer);
    case ".doc":
      return extractDocText(buffer);
    case ".txt":
    case ".md":
    case ".markdown":
      return extractPlainText(buffer);
    default:
      throw new Error("不支持的文件格式。");
  }
}
