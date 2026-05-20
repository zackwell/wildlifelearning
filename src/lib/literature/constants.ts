export const LITERATURE_ALLOWED_EXT =
  /\.(txt|md|markdown|pdf|doc|docx)$/i;

export const MAX_LITERATURE_FILE_BYTES = 10 * 1024 * 1024;

export function literatureFormatLabel(fileName: string): string {
  const m = fileName.match(/(\.[^.]+)$/i);
  const ext = m ? m[1].toLowerCase() : "";
  if (ext === ".pdf") return "PDF";
  if (ext === ".doc" || ext === ".docx") return "Word";
  if (ext === ".md" || ext === ".markdown") return "Markdown";
  return "文本";
}
