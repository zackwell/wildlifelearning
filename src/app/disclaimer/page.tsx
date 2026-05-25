export const metadata = {
  title: "免责声明",
  description: "Nature+ 智能图鉴网站免责声明与使用限制说明。",
};

export default function DisclaimerPage() {
  return (
    <article className="max-w-3xl space-y-8 text-emerald-950 dark:text-emerald-50">
      <header className="space-y-2 border-b border-emerald-900/10 pb-6 dark:border-emerald-100/10">
        <h1 className="text-2xl font-bold sm:text-3xl">免责声明</h1>
        <p className="text-sm text-emerald-900/70 dark:text-emerald-100/70">
          最后更新：2026 年 5 月
        </p>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          欢迎使用 Nature+ 智能图鉴（以下简称「本站」）。访问或使用本站任何功能，即表示您已阅读并理解本声明。若您不同意本声明任何内容，请停止使用本站。
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">一、服务性质</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          本站面向公众提供野生动物科普相关内容，包括物种图鉴生成、个人图鉴管理、智能问答、学习检测及文献辅助检索等功能。上述内容均仅供<strong>科普教育与非商业性个人学习</strong>使用，不构成任何专业意见、学术结论或官方认定。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">二、内容准确性与 AI 生成说明</h2>
        <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          <li>
            图鉴正文、分类信息、摘要、题库及智能助手回答等，可能由人工智能模型自动生成或整理，并可能引用用户上传资料、公开百科信息或第三方素材。本站不保证上述内容完全准确、完整、及时或无遗漏。
          </li>
          <li>
            物种名称、别称、分类阶元、保护级别、分布范围等字段可能随文献更新而变化；模型输出亦可能出现张冠李戴、过度概括或「记载较少」式表述。您应自行核对权威资料后再作引用或传播。
          </li>
          <li>
            配图可能来自第三方图库（如 Unsplash）或用户本地上传。配图仅作示意，不保证与正文描述为同一具体个体、亚种或地理种群。
          </li>
          <li>
            解剖示意、形态描述及识别要点为科普化、简化表达，不保证与真实标本、影像或专业解剖学资料一致，亦不能替代专业解剖学、兽医学或生态调查培训。
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">三、非医疗、非法律、非执法建议</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          本站内容<strong>不构成</strong>兽医诊断、治疗、用药、营养处方、野外伤病处置、疫情防控、生物安全操作、野生动物驯养繁殖许可、猎捕采集、进出口贸易、执法认定或任何需持证执业的专业建议。涉及动物健康、人身安全、法律法规适用或行政许可事项，请咨询具备相应资质的专业机构、医疗机构或主管部门，并以现行有效法律法规及官方发布信息为准。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">四、用户内容与个人图鉴</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          您在使用「我的图鉴」「智能助手补充」「文献上传」等功能时提交的文字、图片及生成结果，由您自行负责。您应确保上传内容不侵犯他人合法权益，不包含违法、有害或误导性信息。因您上传、发布、传播或依赖用户内容所产生的后果，由您自行承担；本站可在合理范围内删除或限制访问违规内容。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">五、第三方服务与外部链接</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          本站可能调用第三方语言模型、嵌入模型、图库、百科或文献检索等服务，也可能提供指向第三方网站的外部链接（如学术检索链接）。第三方服务的可用性、准确性、隐私做法及其内容，均由相应第三方负责。本站不对第三方页面、API 中断、数据丢失或服务变更承担责任。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">六、服务可用性与变更</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          本站可能因维护、升级、网络故障、模型配额、政策要求等原因暂停、限制或终止部分或全部功能，且无需事先通知。本站有权随时调整功能设计、生成策略、速率限制及内容展示方式，无需对因此给您造成的任何直接或间接损失承担责任，法律法规另有规定的除外。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">七、责任限制</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          在适用法律允许的最大范围内，因使用或无法使用本站而产生的任何直接、间接、附带、特殊或后果性损失（包括但不限于数据丢失、学习或研究中断、商业机会丧失、因依赖 AI 内容导致的判断失误），本站及其运营者不承担赔偿责任。若司法管辖区域不允许排除某些责任，则本站在该区域的责任以法律允许的最低范围为限。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">八、声明更新</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          本站有权适时修订本免责声明。更新后的版本自发布于本页面之日起生效。您继续使用本站，即视为接受修订后的声明。建议您定期查阅本页。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">九、联系我们</h2>
        <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-100/85">
          如对本声明有疑问，请通过本站公示的运营联系方式与我们沟通。涉及个人信息处理的事项，请同时参阅
          <a href="/privacy" className="mx-1 font-medium underline-offset-2 hover:underline">
            隐私说明
          </a>
          。
        </p>
      </section>
    </article>
  );
}
