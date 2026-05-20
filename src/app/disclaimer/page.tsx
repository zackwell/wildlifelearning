export const metadata = {
  title: "免责声明",
};

export default function DisclaimerPage() {
  return (
    <article className="max-w-3xl space-y-4 text-emerald-950 dark:text-emerald-50">
      <h1 className="text-2xl font-bold">免责声明</h1>
      <p>
        本站提供的野生动物图文、解剖示意与智能助手内容仅用于<strong>科普教育</strong>目的。解剖图为示意性简化表达，不保证与真实个体或标本完全一致，亦不可替代专业解剖学或兽医影像学资料。
      </p>
      <p>
        智能助手可能产生不完整或误解性的表述。涉及动物健康、伤病处置、野外安全、法律法规执行等问题，请咨询具备资质的专业机构或主管部门。
      </p>
      <p>
        本站不保证内容的实时性与适用性；外部链接仅为方便读者延伸阅读，本站不对第三方页面内容负责。
      </p>
    </article>
  );
}
