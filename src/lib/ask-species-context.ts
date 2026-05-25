export type AskSpeciesContext = {
  name: string;
  scientificName?: string;
  slug?: string;
};

export function questionMentionsSpecies(question: string, speciesName: string): boolean {
  const q = question.trim();
  const name = speciesName.trim();
  if (!q || !name) return false;
  if (q.includes(name)) return true;
  if (name.length >= 2 && q.includes(name.slice(0, Math.min(2, name.length)))) {
    return name.length <= 4;
  }
  return false;
}

/** 问题像「能活多久」这类缺少主语的短问句 */
export function needsSpeciesSubjectInference(question: string): boolean {
  const q = question.trim();
  if (!q || q.length > 120) return false;

  if (/[它其这那此该]/u.test(q)) return false;

  if (/^(能|会|有|是|在|如何|怎么|怎样|为什么|为何|是否|能不能|可不可以|可否)/u.test(q)) {
    return true;
  }
  if (/多久|多长|多大|多重|多少|几个|几块|几|寿命|食性|分布|繁殖|保护|濒危|天敌|习性/u.test(q) && q.length <= 48) {
    return true;
  }
  return false;
}

/**
 * 若已选图鉴物种且问题未写明对象，将问题补全为「{物种}{问题}」供检索与作答。
 */
export function enrichAskQuestionWithSpecies(
  question: string,
  species: AskSpeciesContext | null | undefined,
): { rawQuestion: string; resolvedQuestion: string; speciesApplied: boolean } {
  const raw = question.trim();
  if (!raw || !species?.name?.trim()) {
    return { rawQuestion: raw, resolvedQuestion: raw, speciesApplied: false };
  }

  const name = species.name.trim();
  if (questionMentionsSpecies(raw, name) || !needsSpeciesSubjectInference(raw)) {
    return { rawQuestion: raw, resolvedQuestion: raw, speciesApplied: false };
  }

  let resolved: string;
  if (/^(能|会|有|是|在|如何|怎么|怎样|为什么|为何|是否|能不能|可不可以|可否)/u.test(raw)) {
    resolved = `${name}${raw}`;
  } else {
    resolved = `关于${name}：${raw}`;
  }

  if (!/[？?]$/.test(resolved)) resolved += "？";

  return { rawQuestion: raw, resolvedQuestion: resolved, speciesApplied: true };
}

export function buildAskSpeciesSystemNote(species: AskSpeciesContext): string {
  const name = species.name.trim();
  const sci = species.scientificName?.trim();
  return sci
    ? `用户正在为图鉴物种「${name}」（${sci}）提问。若问题未写明对象（如「能活多久」），默认指该物种。`
    : `用户正在为图鉴物种「${name}」提问。若问题未写明对象（如「能活多久」），默认指该物种。`;
}
