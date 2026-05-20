import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/MarkdownBody";
import { getAllTopics, getTopicBySlug } from "@/lib/content/topics";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllTopics().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const topic = getTopicBySlug(slug);
  if (!topic) return { title: "未找到" };
  return {
    title: topic.frontmatter.title,
    description: topic.frontmatter.summary,
  };
}

export default async function TopicDetailPage(props: Props) {
  const { slug } = await props.params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  return (
    <article>
      <header className="border-b border-emerald-900/10 pb-6 dark:border-emerald-100/10">
        <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">
          <Link href="/topics" className="hover:underline">
            知识专题
          </Link>
          <span className="mx-2">/</span>
          <span>{topic.frontmatter.title}</span>
        </p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950 dark:text-emerald-50">
          {topic.frontmatter.title}
        </h1>
        {topic.frontmatter.summary ? (
          <p className="mt-3 text-base text-emerald-900/85 dark:text-emerald-100/85">
            {topic.frontmatter.summary}
          </p>
        ) : null}
      </header>
      <div className="mt-8">
        <MarkdownBody content={topic.body} />
      </div>
    </article>
  );
}
