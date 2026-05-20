const CHUNK_TARGET = 480;

export function splitTextIntoChunks(body: string): string[] {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > CHUNK_TARGET && buf) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) chunks.push(buf);
  if (chunks.length === 0 && body.trim()) {
    chunks.push(body.trim().slice(0, CHUNK_TARGET * 2));
  }
  return chunks;
}

export function deriveLiteratureTitle(fileName: string, body: string): string {
  const base = fileName.replace(/\.(md|txt|markdown)$/i, "").trim();
  if (base.length >= 2) return base;
  const firstLine = body.split(/\n/).find((l) => l.trim().length > 0)?.trim() ?? "";
  return firstLine.slice(0, 60) || "未命名资料";
}
