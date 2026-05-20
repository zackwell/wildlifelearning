/** 站外学术检索入口（仅打开搜索页，不代理全文） */
export type ReportSearchLink = { label: string; href: string };

export function reportSearchLinks(query: string): ReportSearchLink[] {
  const q = query.trim();
  if (!q) return [];
  const enc = encodeURIComponent(q);
  return [
    { label: "Google Scholar", href: `https://scholar.google.com/scholar?q=${enc}` },
    { label: "PubMed", href: `https://pubmed.ncbi.nlm.nih.gov/?term=${enc}` },
    { label: "Semantic Scholar", href: `https://www.semanticscholar.org/search?q=${enc}` },
    { label: "百度学术", href: `https://xueshu.baidu.com/s?wd=${encodeURIComponent(q)}` },
  ];
}
