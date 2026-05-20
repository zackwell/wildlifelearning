import { TopicsHubClient } from "@/components/topics/TopicsHubClient";

export const metadata = {
  title: "知识专题",
};

export default function TopicsIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">知识专题</h1>
      <p className="mt-2 max-w-2xl text-emerald-900/80 dark:text-emerald-100/80">
        上传并阅读你的文献资料，需要时在智能助手中引用这些内容来回答问题。
      </p>
      <div className="mt-8">
        <TopicsHubClient />
      </div>
    </div>
  );
}
