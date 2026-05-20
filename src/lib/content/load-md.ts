import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export function readMarkdownFiles<T extends Record<string, unknown>>(
  dir: string,
): Array<{ slug: string; data: T; content: string }> {
  const abs = path.join(process.cwd(), dir);
  if (!fs.existsSync(abs)) return [];
  const files = fs.readdirSync(abs).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(abs, file), "utf8");
    const { data, content } = matter(raw);
    const slug = (data.slug as string) ?? file.replace(/\.md$/, "");
    return { slug, data: data as T, content };
  });
}
