import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import OpenAI from "openai";
import { splitTextIntoChunks } from "../src/lib/rag/chunk-text";
import type { RagChunk, RagStore } from "../src/lib/rag/types";

async function embedBatch(
  client: OpenAI,
  inputs: string[],
  model: string,
): Promise<number[][]> {
  const res = await client.embeddings.create({ model, input: inputs });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding as number[]);
}

function indexMarkdownDir(
  dir: string,
  sourceType: "topic" | "admin",
  pathPrefix: string,
  pushChunk: (partial: Omit<RagChunk, "id" | "embedding">) => void,
): void {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data, content } = matter(raw);
    const slug = (data.slug as string) ?? file.replace(/\.md$/, "");
    const title = (data.title as string) ?? slug;
    const summary = typeof data.summary === "string" ? data.summary.trim() : "";
    if (summary) {
      pushChunk({
        text: `摘要：${summary}`,
        speciesId: null,
        sourceType,
        sourceTitle: title,
        sourcePath: `${pathPrefix}/${slug}`,
      });
    }
    splitTextIntoChunks(content).forEach((text) => {
      pushChunk({
        text,
        speciesId: null,
        sourceType,
        sourceTitle: title,
        sourcePath: `${pathPrefix}/${slug}`,
      });
    });
  }
}

async function main() {
  const chunks: RagChunk[] = [];
  let idx = 0;

  const pushChunk = (partial: Omit<RagChunk, "id" | "embedding">) => {
    const id = `${partial.sourceType}:${partial.speciesId ?? partial.sourcePath}:${idx++}`;
    chunks.push({ ...partial, id, embedding: undefined });
  };

  indexMarkdownDir(
    path.join(process.cwd(), "content", "topics"),
    "topic",
    "/topics",
    pushChunk,
  );
  indexMarkdownDir(
    path.join(process.cwd(), "data", "admin-knowledge"),
    "admin",
    "/admin-knowledge",
    pushChunk,
  );

  const store: RagStore = { version: 1, chunks };
  const key =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OLLAMA_API_KEY?.trim() ||
    "";
  const baseURL =
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    undefined;
  const embedModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

  if (key && chunks.length > 0) {
    const client = new OpenAI({ apiKey: key, baseURL });
    const batchSize = 16;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      const vectors = await embedBatch(
        client,
        slice.map((c) => c.text),
        embedModel,
      );
      slice.forEach((c, j) => {
        c.embedding = vectors[j];
      });
      process.stdout.write(`Embedded ${Math.min(i + batchSize, chunks.length)}/${chunks.length}\n`);
    }
  } else if (!key) {
    process.stdout.write(
      "未设置 OPENAI_API_KEY 或 OLLAMA_API_KEY：已生成仅含文本的 rag.json（检索将使用关键词匹配）。\n",
    );
  }

  const outDir = path.join(process.cwd(), "data");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "rag.json"), JSON.stringify(store, null, 2), "utf8");
  process.stdout.write(`Wrote ${chunks.length} chunks to data/rag.json\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
