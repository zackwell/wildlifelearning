import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeModelMarkdown } from "@/lib/normalize-model-markdown";

type MarkdownBodyProps = {
  content: string;
  className?: string;
  /** default：正文页；compact：图鉴详情等；exploreField：首页探索卡片内（略小字号 + sky 色系） */
  variant?: "default" | "compact" | "exploreField";
};

export function MarkdownBody({ content, className = "", variant = "default" }: MarkdownBodyProps) {
  const normalized = normalizeModelMarkdown(content);
  const variantClass =
    variant === "exploreField"
      ? "markdown-body--compact markdown-body--field-explore"
      : variant === "compact"
        ? "markdown-body--compact"
        : "";

  return (
    <div className={`markdown-body ${variantClass} ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalized}</ReactMarkdown>
    </div>
  );
}
