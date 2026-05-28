import { TopicsHubClient } from "@/components/topics/TopicsHubClient";
import { TopicsPageIntro } from "@/components/topics/TopicsPageIntro";

export const metadata = {
  title: "知识专题",
};

export default function TopicsIndexPage() {
  return (
    <div>
      <TopicsPageIntro />
      <div className="mt-8">
        <TopicsHubClient />
      </div>
    </div>
  );
}
