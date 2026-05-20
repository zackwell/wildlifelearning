import type { ParsedTopic, TopicFrontmatter } from "./types";
import { readMarkdownFiles } from "./load-md";

const DIR = "content/topics";

export function getAllTopics(): ParsedTopic[] {
  return readMarkdownFiles<TopicFrontmatter>(DIR)
    .map(({ slug, data, content }) => ({
      slug: data.slug ?? slug,
      frontmatter: data,
      body: content,
    }))
    .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title, "zh-CN"));
}

export function getTopicBySlug(slug: string): ParsedTopic | undefined {
  return getAllTopics().find((t) => t.slug === slug);
}
