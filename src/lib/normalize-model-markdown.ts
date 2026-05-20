/**
 * 模型经 JSON 输出时，常把换行写成字面量「\\n」，导致 Markdown 无法识别标题与段落。
 * 将字面量转义序列还原为真实字符（对常规正文内容安全）。
 */
export function normalizeModelMarkdown(input: string): string {
  let s = input;
  if (typeof s !== "string") return "";
  s = s.trim();
  if (!s) return s;

  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(/\\r\\n/g, "\n");
    s = s.replace(/\\n/g, "\n");
    s = s.replace(/\\t/g, "\t");
  }

  s = s.replace(/\u00a0/g, " ");
  s = s.replace(/\n{5,}/g, "\n\n\n\n");
  return s.trim();
}
