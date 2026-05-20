export type TopicFrontmatter = {
  slug: string;
  title: string;
  summary?: string;
};

export type ParsedTopic = {
  slug: string;
  frontmatter: TopicFrontmatter;
  body: string;
};
