/** 抽样判断正文是否以中文为主（用于决定翻译还是仅排版） */
export function isPredominantlyChinese(body: string): boolean {
  const sample = body.slice(0, 12000);
  const cjk = (sample.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latin = (sample.match(/[a-zA-Z]/g) ?? []).length;
  if (cjk < 40) return false;
  if (latin === 0) return true;
  return cjk / (cjk + latin) >= 0.35;
}
