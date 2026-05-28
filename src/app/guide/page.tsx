import Link from "next/link";

export const metadata = {
  title: "使用说明",
  description: "Nature+ 智能图鉴各板块功能与用法说明。",
};

const sectionClass = "space-y-3";
const h2Class = "text-lg font-semibold text-stone-900 dark:text-stone-50";
const pClass = "leading-relaxed text-stone-700/90 dark:text-stone-200/85";
const ulClass = "list-disc space-y-2 pl-5 leading-relaxed text-stone-700/90 dark:text-stone-200/85";
const tipClass =
  "rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100";

export default function GuidePage() {
  return (
    <article className="max-w-3xl space-y-10 text-stone-900 dark:text-stone-50">
      <header className="space-y-3 border-b border-stone-900/10 pb-6 dark:border-stone-100/10">
        <h1 className="text-2xl font-bold sm:text-3xl">使用说明</h1>
        <p className={pClass}>
          本文介绍 Nature+ 智能图鉴各板块的功能与常用操作，帮助您快速上手。本站面向科普学习，图鉴与问答内容由 AI
          辅助生成，请以权威资料为准。
        </p>
        <nav className="flex flex-wrap gap-2 text-sm">
          {[
            ["#account", "账号"],
            ["#explore", "探索动物"],
            ["#field-guide", "我的图鉴"],
            ["#learn", "学习检测"],
            ["#question-bank", "我的题库"],
            ["#topics", "知识专题"],
            ["#ask", "智能助手"],
            ["#settings", "账号设置"],
            ["#tips", "常见问题"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg border border-stone-800/15 px-3 py-1 font-medium text-stone-800 hover:bg-stone-100 dark:border-stone-100/15 dark:text-stone-100 dark:hover:bg-stone-800/50"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section id="account" className={sectionClass}>
        <h2 className={h2Class}>一、账号与登录</h2>
        <p className={pClass}>
          在欢迎页可选择<strong>游客登录</strong>或<strong>注册 / 登录</strong>。游客可直接浏览与生成预览；注册并登录后，图鉴、题库与文献元数据会同步至云端，换设备登录仍可访问。
        </p>
        <ul className={ulClass}>
          <li>
            <strong>注册：</strong>使用邮箱与密码（至少 8 位）创建账号，注册成功后自动登录。
          </li>
          <li>
            <strong>登录：</strong>输入已注册邮箱与密码；也可选择「以游客身份继续」，不保存云端数据。
          </li>
          <li>
            <strong>数据迁移：</strong>首次登录时，系统会尝试将本机浏览器中已有的图鉴、题库等本地数据导入云端（若存在）。
          </li>
        </ul>
        <p className={tipClass}>
          提示：未登录时图鉴等数据保存在本机浏览器，清除缓存或换设备会丢失。重要内容建议注册账号备份。
        </p>
      </section>

      <section id="explore" className={sectionClass}>
        <h2 className={h2Class}>二、首页 · 探索动物</h2>
        <p className={pClass}>
          路径：<Link href="/main" className="font-medium underline-offset-2 hover:underline">首页</Link>
          。在输入框填写动物中文常用名、别称或拉丁学名（1–80 字），点击「AI 生成预览」。
        </p>
        <ul className={ulClass}>
          <li>
            <strong>名称建议：</strong>尽量精确到种，如「东北虎」「扭角羚」；统称如「虎」「羊」可能弹出物种选择框，请点选具体种类。
          </li>
          <li>
            <strong>名称纠正：</strong>若系统识别到常见误写（如字序颠倒），会提示是否改用推荐名称。
          </li>
          <li>
            <strong>生成过程：</strong>页面会显示进度提示；冷门物种可能需要等待较久，请保持页面打开。
          </li>
          <li>
            <strong>预览内容：</strong>包含摘要、分类、栖息地、食性、保护状况、身体结构、习性、冷知识、概览正文及站外文献检索链接；配图来自图库自动匹配，可能有偏差。
          </li>
          <li>
            <strong>配图调整：</strong>预览轮播支持左右滑动（手机端）切换；可点「移除此图」去掉不合适的照片后再保存。
          </li>
          <li>
            <strong>加入图鉴：</strong>确认内容后点「加入我的图鉴」。若该物种已在图鉴中，按钮会变为「已在图鉴中 · 查看」，不会重复创建。
          </li>
          <li>
            <strong>重复搜索：</strong>若您已保存过该物种，再次搜索时会提示「已在图鉴中」，可选择查看已有条目，或确认后「仍要重新生成预览」。
          </li>
        </ul>
        <p className={tipClass}>
          图鉴展示名优先使用规范中文种名（如独角仙显示为「双叉犀金龟」），别称关系会在摘要中说明。
        </p>
      </section>

      <section id="field-guide" className={sectionClass}>
        <h2 className={h2Class}>三、我的图鉴</h2>
        <p className={pClass}>
          路径：<Link href="/my-field-guide" className="font-medium underline-offset-2 hover:underline">我的图鉴</Link>
          。收藏您探索并保存的物种条目，支持排序、星标与删除。
        </p>
        <ul className={ulClass}>
          <li>
            <strong>列表：</strong>可按保存时间、名称等排序；可用顶部搜索框按中文名、学名、分类关键词筛选；可筛选「仅星标」快速找到重点物种。
          </li>
          <li>
            <strong>详情页：</strong>点击条目进入，阅读完整图鉴正文；顶部可跳转「智能助手提问」或「学习检测」。
          </li>
          <li>
            <strong>配图管理：</strong>可上传本机照片、删除不合适配图、设置封面；手机端图集支持左右滑动浏览。
          </li>
          <li>
            <strong>星标：</strong>在列表中为条目加星，便于标记重点复习对象。
          </li>
          <li>
            <strong>删除：</strong>「从图鉴移除」会删除该条目（需确认）；登录用户同步删除云端记录。
          </li>
          <li>
            <strong>文献检索：</strong>详情页提供 Google 学术、CNKI 等站外检索链接，便于延伸阅读（跳转至第三方网站）。
          </li>
        </ul>
      </section>

      <section id="learn" className={sectionClass}>
        <h2 className={h2Class}>四、学习检测</h2>
        <p className={pClass}>
          在图鉴详情页点击「学习检测」，系统将根据该物种图鉴内容自动生成一套测验题。
        </p>
        <ul className={ulClass}>
          <li>
            <strong>题型：</strong>含选择题、判断题、思维多选题等；客观题提交后自动判分，主观/开放题由 AI 阅卷并给出评语。
          </li>
          <li>
            <strong>流程：</strong>阅读说明 → 生成试卷（需等待）→ 作答 → 查看得分与解析。
          </li>
          <li>
            <strong>保存题目：</strong>结果页可勾选题目并保存至「我的题库」，方便日后复习。
          </li>
        </ul>
        <p className={tipClass}>
          测验题同样由 AI 生成，难度与准确性因物种而异，建议结合图鉴正文与权威资料核对。
        </p>
      </section>

      <section id="question-bank" className={sectionClass}>
        <h2 className={h2Class}>五、我的题库</h2>
        <p className={pClass}>
          路径：<Link href="/my-question-bank" className="font-medium underline-offset-2 hover:underline">我的题库</Link>
          。存放从学习检测中保存的题目组，按物种分组展示。
        </p>
        <ul className={ulClass}>
          <li>点击题组标题可展开/收起查看各题与参考答案要点。</li>
          <li>可删除整组题目；登录后数据同步云端。</li>
          <li>若列表为空，请先在某一图鉴的「学习检测」结果页勾选并保存题目。</li>
        </ul>
      </section>

      <section id="topics" className={sectionClass}>
        <h2 className={h2Class}>六、知识专题</h2>
        <p className={pClass}>
          路径：<Link href="/topics" className="font-medium underline-offset-2 hover:underline">知识专题</Link>
          。上传并管理您的文献资料，供智能助手检索引用。进入该页可点「使用引导」查看推荐流程与文献类型说明。
        </p>
        <ul className={ulClass}>
          <li>
            <strong>上传：</strong>支持 PDF、Word、Markdown、纯文本等格式；上传后可在线阅读。
          </li>
          <li>
            <strong>启用问答：</strong>每篇文献可开关「参与智能助手检索」；关闭后助手不会引用该文献。
          </li>
          <li>
            <strong>检索优化：</strong>外文可「生成检索版」（翻译+排版）；中文文献可「智能排版」。处理在后台进行，完成后便于中文提问时被助手引用；阅读页可切换原文与优化版。
          </li>
          <li>
            <strong>适合的资料：</strong>与在学物种相关的科普、教材节选、论文摘要、野外手册等文字清晰的文档；扫描无文字层或整本大部头不宜直接上传。
          </li>
          <li>
            <strong>联动建议：</strong>图鉴看概览 → 专题上传深度文献并启用引用 → 智能助手关联图鉴提问 → 满意回答可补充至图鉴。
          </li>
          <li>
            <strong>内置专题：</strong>站点亦提供部分预设专题文章，可直接阅读学习。
          </li>
        </ul>
        <p className={tipClass}>
          文献内容仅在您账号下使用；请确保上传资料不侵犯他人版权。
        </p>
      </section>

      <section id="ask" className={sectionClass}>
        <h2 className={h2Class}>七、智能助手</h2>
        <p className={pClass}>
          路径：<Link href="/ask" className="font-medium underline-offset-2 hover:underline">智能助手</Link>
          。基于您启用的文献摘录作答，必要时辅以通识补充。
        </p>
        <ul className={ulClass}>
          <li>
            <strong>关联图鉴（可选）：</strong>可从下拉列表选择「我的图鉴」中的物种，或手动输入物种名。选中后，短问题会自动补全主语（如输入「能活多久」→「东北虎能活多久」）。
          </li>
          <li>
            <strong>提问：</strong>输入问题后提交；回答中会标注引用来源（文献摘录或通识模式）。
          </li>
          <li>
            <strong>补充至图鉴：</strong>若已关联图鉴条目且该条目在「我的图鉴」中存在，回答页可点「补充至图鉴」，将整理后的内容并入对应栏目（如习性、冷知识等）。图鉴条目需先通过探索动物「加入我的图鉴」创建。
          </li>
          <li>
            <strong>从图鉴跳转：</strong>图鉴详情页的「智能助手提问」会带上物种名，方便针对性提问。
          </li>
        </ul>
      </section>

      <section id="settings" className={sectionClass}>
        <h2 className={h2Class}>八、账号设置</h2>
        <p className={pClass}>
          路径：<Link href="/account" className="font-medium underline-offset-2 hover:underline">账号设置</Link>
          （需登录）。可修改显示昵称、更改密码，以及配置界面与学习偏好。
        </p>
        <ul className={ulClass}>
          <li>昵称会显示在站点头部账号区域。</li>
          <li>修改密码需输入当前密码与新密码。</li>
          <li>
            <strong>使用偏好（本机保存）：</strong>外观主题（跟随系统 / 浅色 / 深色）、图鉴列表默认排序与星标筛选、文献上传后是否默认参与助手检索、知识专题引导与确认弹窗等。
          </li>
          <li>退出登录后，云端数据仍保留，下次登录可继续访问。</li>
          <li>
            <strong>注销账户：</strong>在「登录」区块可永久删除账号及全部云端图鉴、题库、文献，需输入当前密码确认，且不可恢复。
          </li>
        </ul>
      </section>

      <section id="tips" className={sectionClass}>
        <h2 className={h2Class}>九、常见问题与使用建议</h2>
        <ul className={ulClass}>
          <li>
            <strong>生成失败或超时：</strong>冷门物种、网络波动或服务器繁忙可能导致失败，请稍后重试；若多次失败，可换更具体的物种名或缩短等待后重试。
          </li>
          <li>
            <strong>配图不准：</strong>自动配图仅作示意，可在预览或图鉴详情中移除并上传自己的照片。
          </li>
          <li>
            <strong>内容准确性：</strong>AI 生成内容可能存在错误或过时信息，引用前请核对专业文献与官方资料。
          </li>
          <li>
            <strong>请求频率：</strong>探索动物与智能助手设有频率限制，连续测试请适当间隔。
          </li>
          <li>
            <strong>游客与登录：</strong>游客数据存本机；注册登录后享受云端同步与跨设备访问。
          </li>
        </ul>
      </section>

      <section className={`${sectionClass} border-t border-stone-900/10 pt-8 dark:border-stone-100/10`}>
        <h2 className={h2Class}>相关说明</h2>
        <p className={pClass}>
          使用本站即表示您理解本站为科普教育用途。详情请阅{" "}
          <Link href="/disclaimer" className="font-medium underline-offset-2 hover:underline">
            免责声明
          </Link>{" "}
          与{" "}
          <Link href="/privacy" className="font-medium underline-offset-2 hover:underline">
            隐私说明
          </Link>
          。如有问题，可通过账号设置页或登录页底部的邮箱联系维护者。
        </p>
      </section>
    </article>
  );
}
