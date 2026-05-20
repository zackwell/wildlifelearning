import fs from "node:fs";
import path from "node:path";
import type { LiteratureDocument, RagChunk } from "@/lib/rag/types";

const LEGACY_DIR = path.join(process.cwd(), "data", "user-literature");

function safeId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe || safe !== id) throw new Error("invalid id");
  return safe;
}

function userDir(userId: string): string {
  return path.join(process.cwd(), "data", "users", userId, "literature");
}

function userDocPath(userId: string, id: string): string {
  return path.join(userDir(userId), `${safeId(id)}.json`);
}

function legacyDocPath(id: string): string {
  return path.join(LEGACY_DIR, `${safeId(id)}.json`);
}

function readDocFile(filePath: string): LiteratureDocument | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const doc = JSON.parse(raw) as LiteratureDocument;
    if (!doc?.id || !doc.body || !Array.isArray(doc.chunks)) return null;
    return doc;
  } catch {
    return null;
  }
}

export function readLiteratureDocument(userId: string, id: string): LiteratureDocument | null {
  return readDocFile(userDocPath(userId, id));
}

export function readLegacyLiteratureDocument(id: string): LiteratureDocument | null {
  return readDocFile(legacyDocPath(id));
}

export function writeLiteratureDocument(userId: string, doc: LiteratureDocument): void {
  const dir = userDir(userId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(userDocPath(userId, doc.id), JSON.stringify(doc, null, 2), "utf8");
}

export function deleteLiteratureDocument(userId: string, id: string): boolean {
  try {
    const p = userDocPath(userId, id);
    if (!fs.existsSync(p)) return false;
    fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

/** 将旧版全局目录中的文献迁入用户目录 */
export function migrateLegacyLiteratureDocument(userId: string, id: string): boolean {
  const legacy = readLegacyLiteratureDocument(id);
  if (!legacy) return false;
  writeLiteratureDocument(userId, legacy);
  try {
    const p = legacyDocPath(id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    /* 已复制到用户目录即可 */
  }
  return true;
}

export function loadLiteratureChunks(userId: string, ids: string[]): RagChunk[] {
  const out: RagChunk[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const doc = readLiteratureDocument(userId, id);
    if (!doc) continue;
    for (const c of doc.chunks) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/** 游客模式：读取旧版全局文献（逐步废弃） */
export function loadLegacyLiteratureChunks(ids: string[]): RagChunk[] {
  const out: RagChunk[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const doc = readLegacyLiteratureDocument(id);
    if (!doc) continue;
    for (const c of doc.chunks) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}
