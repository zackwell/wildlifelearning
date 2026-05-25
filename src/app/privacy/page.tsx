export const metadata = {
  title: "隐私说明",
  description: "Nature+ 智能图鉴个人信息与数据处理方式说明。",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl space-y-8 text-emerald-950 dark:text-emerald-50">
      <header className="space-y-2 border-b border-emerald-900/10 pb-6 dark:border-emerald-100/10">
        <h1 className="text-2xl font-bold sm:text-3xl">隐私说明</h1>
        <p className="text-sm text-emerald-900/70 dark:text-emerald-100/70">
          最后更新：2026 年 5 月
        </p>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          Nature+ 智能图鉴（以下简称「本站」）重视您的个人信息与隐私保护。本说明旨在向您清晰说明我们如何处理与保护相关信息。使用本站即表示您已阅读并理解本说明；若您不同意，请停止使用相关功能。
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">一、适用范围</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          本说明适用于您通过本站网页及相关 API 使用账户注册登录、探索图鉴、保存个人图鉴、智能问答、文献上传、学习检测等功能时，我们收集、使用、存储与保护信息的行为。本说明不适用于第三方网站、第三方模型服务商或您自行跳转访问的外部链接，其隐私做法以第三方政策为准。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">二、我们收集的信息</h2>
        <div className="space-y-4 leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          <div>
            <h3 className="font-medium">1. 账户信息（注册登录用户）</h3>
            <p className="mt-1">
              当您注册账户时，我们可能收集您的电子邮箱、登录密码（仅以加密哈希形式存储，不保存明文密码）、可选显示名称，以及账户创建时间。登录后我们会为您建立会话以维持登录状态。
            </p>
          </div>
          <div>
            <h3 className="font-medium">2. 您主动提供的内容</h3>
            <p className="mt-1">
              包括但不限于：个人图鉴条目（物种名称、正文、配图链接、用户上传图片等）、智能助手提问与回答、图鉴补充内容、学习检测作答、您上传至「知识专题」的文献文件及其标题与元数据。
            </p>
          </div>
          <div>
            <h3 className="font-medium">3. 未登录用户的本地数据</h3>
            <p className="mt-1">
              若您未登录，部分数据（如个人图鉴）可能仅保存在您浏览器的本地存储（localStorage）中，由您的设备本地管理，不会自动同步至云端，除非您后续注册登录并主动迁移或重新保存。
            </p>
          </div>
          <div>
            <h3 className="font-medium">4. 技术信息与日志</h3>
            <p className="mt-1">
              为保障服务安全与稳定，我们可能处理：浏览器类型、访问时间、请求路径、错误信息等基础运行日志；为防范滥用，问答与图鉴生成等接口可能基于 IP 地址或类似标识实施速率限制。速率限制数据通常在服务器内存中短期保存，用于计数，不作为长期用户画像使用。
            </p>
          </div>
          <div>
            <h3 className="font-medium">5. Cookie 与会话标识</h3>
            <p className="mt-1">
              登录用户会收到用于维持会话的 Cookie（如 <code className="rounded bg-emerald-900/5 px-1 dark:bg-emerald-100/10">wl_session</code>
              ）。该 Cookie 为 HttpOnly，用于识别已登录状态，登出或过期后将失效。
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">三、我们如何使用信息</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          <li>提供、维护与改进本站核心功能（图鉴生成、保存、检索、问答、学习检测等）；</li>
          <li>验证身份、维持登录会话、保障账户安全；</li>
          <li>在您启用文献引用时，将您的问题与已授权文献片段用于检索与回答；</li>
          <li>将必要文本发送至第三方语言模型/嵌入服务以生成图鉴或回答（详见下文「第三方处理」）；</li>
          <li>实施速率限制、故障排查、安全防护与合规要求；</li>
          <li>在法律法规要求或有权机关依法提出请求时，配合提供必要信息。</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">四、第三方处理与跨境传输</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          为实现 AI 生成与问答，本站可能将您输入的物种名称、问题文本、图鉴字段及检索到的文献片段，发送至本站配置的第三方模型服务（例如 OpenAI 兼容接口或自托管 Ollama 等）。具体服务商、处理地点与规则取决于站点部署配置。我们可能同时使用第三方图库（如 Unsplash）获取配图，以及云数据库（如 Neon PostgreSQL）存储登录用户数据。我们仅向第三方传输实现功能所必要的信息，并建议您同时查阅相应第三方的隐私政策。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">五、信息存储与保留期限</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          <li>
            <strong>账户与云端图鉴：</strong>在您删除账户、删除相应条目或我们依法停止服务前，相关数据将保留于服务器数据库中；
          </li>
          <li>
            <strong>会话：</strong>登录会话在过期或您主动登出后失效；
          </li>
          <li>
            <strong>本地存储：</strong>保存在您浏览器中的数据，由您通过清除站点数据或卸载浏览器等方式自行删除；
          </li>
          <li>
            <strong>运行日志与速率限制：</strong>通常在短期必要期限内保留或即时丢弃，不用于长期归档，除非法律另有要求。
          </li>
        </ul>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          智能问答请求内容是否被第三方模型服务商长期留存，取决于该服务商的政策；本站不控制第三方服务器的日志策略。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">六、信息共享与披露</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          我们不会出售您的个人信息。除以下情形外，我们不会向无关第三方共享您的个人信息：
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          <li>经您明确同意；</li>
          <li>为提供您请求的功能，向模型、托管、数据库等必要服务提供商传输；</li>
          <li>为遵守法律法规、司法裁定、行政执法要求；</li>
          <li>为保护本站、用户或公众的合法权益所合理必要的情形。</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">七、您的权利与选择</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          在适用法律允许的范围内，您可以通过以下方式管理您的信息：
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          <li>在「我的图鉴」中编辑、删除图鉴条目；</li>
          <li>在「知识专题」中管理已上传文献及是否用于智能助手引用；</li>
          <li>通过账户设置修改显示名称或登出账户；</li>
          <li>清除浏览器本地存储以删除未登录状态下保存在本机的数据；</li>
          <li>通过本站公示联系方式，申请查询、更正或删除与您账户相关的云端数据（我们将在合理期限内核实并处理）。</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">八、信息安全</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          我们采取合理的技术与管理措施保护信息安全，例如密码哈希存储、HttpOnly 会话 Cookie、HTTPS 传输（在正确部署时）及访问控制。但互联网传输与存储无法保证绝对安全；请您妥善保管账户凭据，勿在公共设备上保持登录。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">九、未成年人保护</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          本站主要面向具备相应阅读与判断能力的用户。若您为未成年人，请在监护人同意与指导下使用本站，并避免上传可识别个人身份的敏感信息。监护人如认为未成年人在未经同意的情况下向我们提供了个人信息，可通过联系方式与我们联络。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">十、说明的更新</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          我们可能适时更新本隐私说明。更新版本将发布于本页面并注明「最后更新」日期。重大变更时，我们可能通过站内提示等方式告知。若您继续使用本站，即视为接受更新后的说明。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">十一、联系我们</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          如对本隐私说明或个人信息处理有任何疑问、意见或投诉，请通过本站公示的运营联系方式与我们联系。涉及内容准确性、使用风险等事项，请同时参阅
          <a href="/disclaimer" className="mx-1 font-medium underline-offset-2 hover:underline">
            免责声明
          </a>
          。
        </p>
      </section>
    </article>
  );
}
