import fs from "node:fs";
import path from "node:path";
import type { RagStore } from "./types";

let cache: RagStore | null = null;

export function loadRagStore(): RagStore {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "rag.json");
  if (!fs.existsSync(file)) {
    cache = { version: 1, chunks: [] };
    return cache;
  }
  const raw = fs.readFileSync(file, "utf8");
  cache = JSON.parse(raw) as RagStore;
  return cache;
}

export function clearRagStoreCache() {
  cache = null;
}
