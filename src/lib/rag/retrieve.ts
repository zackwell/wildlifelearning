import { cosineSimilarity } from "./cosine";
import { keywordScore } from "./keyword";
import { loadRagStore } from "./store";
import type { Citation, RagChunk } from "./types";
import { loadLiteratureChunks, loadLegacyLiteratureChunks } from "@/lib/literature/server-store";

export type RetrieveOptions = {
  query: string;
  topK?: number;
  queryEmbedding?: number[] | null;
  literatureIds?: string[];
  /** 登录用户 ID，用于读取用户文献 */
  userId?: string;
};

function scoreChunks(
  chunks: RagChunk[],
  query: string,
  queryEmbedding: number[] | null | undefined,
): { chunk: RagChunk; score: number }[] {
  return chunks
    .map((chunk) => {
      const kw = keywordScore(chunk.text, query);
      let score = kw;
      if (
        queryEmbedding?.length &&
        chunk.embedding?.length === queryEmbedding.length
      ) {
        score =
          0.65 * cosineSimilarity(queryEmbedding, chunk.embedding) + 0.35 * kw;
      }
      return { chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function retrieveChunks(opts: RetrieveOptions): { chunk: RagChunk; score: number }[] {
  const { query, topK = 6, queryEmbedding, literatureIds, userId } = opts;
  const base = loadRagStore().chunks;
  const literature = literatureIds?.length
    ? userId
      ? loadLiteratureChunks(userId, literatureIds)
      : loadLegacyLiteratureChunks(literatureIds)
    : [];
  const all = [...base, ...literature];
  return scoreChunks(all, query, queryEmbedding).slice(0, topK);
}

export function toCitations(rows: { chunk: RagChunk }[]): Citation[] {
  return rows.map(({ chunk }) => ({
    id: chunk.id,
    excerpt: chunk.text.length > 320 ? `${chunk.text.slice(0, 320)}…` : chunk.text,
    sourceTitle: chunk.sourceTitle,
    sourcePath: chunk.sourcePath,
  }));
}
