export const metadata = {
  title: "隐私说明",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl space-y-4 text-emerald-950 dark:text-emerald-50">
      <h1 className="text-2xl font-bold">隐私说明（占位）</h1>
      <p>
        当前演示站点在问答接口中使用基础速率限制，可能依赖反向代理提供的 IP 头信息。若您部署到生产环境，请补充完整的隐私政策，说明是否记录提问内容、保留时长、是否与第三方模型服务商共享数据等。
      </p>
      <p>
        建议在正式运营前完成：Cookie 与本地存储说明、联系邮箱、数据删除请求流程，以及未成年人使用提示（如适用）。
      </p>
    </article>
  );
}
