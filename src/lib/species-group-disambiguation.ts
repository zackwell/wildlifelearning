import OpenAI from "openai";
import { extractJsonObject } from "@/lib/explore-species";
import {
  type SpeciesDisambiguation,
  type SpeciesDisambiguationOption,
  looksSpecificSpeciesName,
  normalizeExploreSpeciesQuery,
  resolveCuratedSpeciesDisambiguation,
} from "@/lib/species-group-disambiguation-data";

export type {
  SpeciesDisambiguation,
  SpeciesDisambiguationOption,
} from "@/lib/species-group-disambiguation-data";
export {
  isSpeciesDisambiguationPayload,
  normalizeExploreSpeciesQuery,
  resolveCuratedSpeciesDisambiguation,
} from "@/lib/species-group-disambiguation-data";

const LLM_DISAMBIG_SYSTEM = `你是动物分类助手。判断用户输入的中文名称是「具体某一种动物」还是「一类动物的统称」。

规则：
1. 具体物种（如东北虎、赤狐、阔耳狐、双垂鹤鸵、单垂鹤鸵、亚洲象、大熊猫、犰狳、鸵鸟）→ {"needsDisambiguation":false}
2. 类群统称、俗名总称（如大象、象、虎、羊、猴子、猴、鹦鹉、鲨鱼、鹿、熊、鹤鸵、食火鸡）→ 需要消歧：
   {"needsDisambiguation":true,"groupName":"羊","options":[{"id":"sheep","label":"绵羊","query":"绵羊","hint":""}, ...]}
3. options 列出 3～5 个中国科普语境下最常见、彼此可区分的物种中文名；query 与 label 一致用中文。
4. groupName 用用户输入的统称（如用户写「猴子」则 groupName 为「猴子」）。
5. 不要编造不存在的动物。只输出一个 JSON 对象，不要 Markdown。`;

export async function inferSpeciesDisambiguationWithLlm(
  client: OpenAI,
  model: string,
  query: string,
): Promise<SpeciesDisambiguation | null> {
  const q = normalizeExploreSpeciesQuery(query);
  if (!q) return null;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      max_tokens: 512,
      messages: [
        { role: "system", content: LLM_DISAMBIG_SYSTEM },
        { role: "user", content: `用户输入：${q}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = extractJsonObject(raw) as {
      needsDisambiguation?: boolean;
      groupName?: string;
      options?: Array<{ id?: string; label?: string; query?: string; hint?: string }>;
    };

    if (!parsed.needsDisambiguation || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      return null;
    }

    const groupName = (parsed.groupName ?? q).trim();
    const options: SpeciesDisambiguationOption[] = [];
    for (const o of parsed.options.slice(0, 6)) {
      const label = o.label?.trim();
      const oq = o.query?.trim() || label;
      if (!label || !oq) continue;
      options.push({
        id: o.id?.trim() || `opt-${options.length}`,
        label,
        query: oq,
        hint: o.hint?.trim(),
      });
    }
    if (options.length < 2) return null;

    return {
      groupName,
      prompt: `「${groupName}」包含多个常见物种，你想查询哪一种？`,
      options,
      allowGeneric: true,
      genericLabel: `继续查看笼统的「${groupName}」介绍`,
    };
  } catch {
    return null;
  }
}

/**
 * 统称消歧：优先 LLM 判断；失败或未配置密钥时用内置表兜底。
 */
export async function resolveSpeciesDisambiguation(
  query: string,
  client?: OpenAI,
  model?: string,
): Promise<SpeciesDisambiguation | null> {
  const q = normalizeExploreSpeciesQuery(query);
  if (!q) return null;

  if (looksSpecificSpeciesName(q)) {
    return null;
  }

  if (client && model && process.env.SPECIES_DISAMBIG_LLM !== "0") {
    const inferred = await inferSpeciesDisambiguationWithLlm(client, model, q);
    if (inferred) return inferred;
  }

  return resolveCuratedSpeciesDisambiguation(q);
}
