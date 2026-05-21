import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  enforceUserQuerySpeciesName,
  extractJsonObject,
  parseExploreSpeciesJson,
} from "@/lib/explore-species";
import { resolveSpeciesNameAlias } from "@/lib/species-name-aliases";
import {
  buildExploreSpeciesUserPrompt,
  resolveSpeciesWikiAnchor,
} from "@/lib/species-wiki-anchor";
import { resolveSpeciesGalleryWithFallback } from "@/lib/species-image";
import { resolveSpeciesDisambiguation } from "@/lib/species-group-disambiguation";
import { normalizeExploreSpeciesQuery } from "@/lib/species-group-disambiguation-data";
import { validateExploreSpeciesQuery } from "@/lib/species-query-validate";
import { resolveSpeciesNameSuggestion } from "@/lib/species-query-suggestions";
import {
  detectAnchorContentMismatch,
  detectPlaceholderUnknownPayload,
} from "@/lib/species-content-anchor-check";
import { baiduReferenceIsRich } from "@/lib/species-baidu-baike";
import {
  resolveImageSearchEnglish,
  translateSpeciesNameForImageSearch,
} from "@/lib/species-image-name-translate";
import {
  buildSpeciesImageSearchContext,
  isLikelyScientificName,
  isValidImageSearchCommonName,
  isValidImageSearchEn,
} from "@/lib/species-image-search-context";

export const runtime = "nodejs";
/** 图鉴生成含多次 LLM，自托管也建议 Nginx proxy_read_timeout ≥ 300s */
export const maxDuration = 300;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const buckets = new Map<string, number[]>();

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function allowRate(ip: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) return false;
  arr.push(now);
  buckets.set(ip, arr);
  return true;
}

function resolveApiKey(): string {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OLLAMA_API_KEY?.trim() ||
    ""
  );
}

function resolveBaseUrl(): string | undefined {
  const u =
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    "";
  return u || undefined;
}

const SYSTEM = `你是野生动物科普作者。用户会提供一个动物中文名或常用名（含生僻字、异体字、古籍用字）。请生成「个人图鉴」JSON 草稿：语气科普、审慎。

物种身份（最重要）：
- 必须只写用户指定的那一种动物；JSON 的 name 与用户输入逐字相同，不得改字、不得换成近形字或更常见的物种。
- 不得因不认识某汉字就擅自改答其他鸟兽（例如用户输入罕见字鸟名时，禁止改成䴙䴘、啄木鸟、鹰、鸡等）。
- 若系统给出「物种身份/异名」说明（如某字即今称巨嘴鸟），须按该物种写详实正文，name 仍用用户输入字形；不得写「记载较少」敷衍。
- 若维基锚定与用户输入冲突且无异名说明，以用户输入为准；不得张冠李戴。
- 资料充分时尽量写详：突出该物种相对近缘种或易混种的差异，让读者看出「为什么是这一种」。
- 资料稀少或文献记载不一时：仍须填满各字段，用较短段落如实写「尚不明确」「记载较少」「待进一步核实」，不要空白或一句话敷衍整个字段；不要为凑长度编造具体数据、法规条款或新闻。
- 配图由系统另行从图库检索，与正文生成无关；即使最终无配图，也须按可靠生物学知识写详实正文，禁止以「无图」「找不到照片」为由整篇写「记载较少」或敷衍。
- 各 Markdown 字段可用 ## / ### 分层；能写多则多写，写不长时少几个小节也可以。

输出格式（必须满足，否则前端无法解析）：
1. 只输出一个 JSON 对象，不要使用 Markdown 代码围栏，不要在 JSON 前后写解释文字。
2. 下列键必须全部存在且为非空字符串（Markdown 不含 YAML frontmatter）：
   slug, name, scientificName, taxon, habitat, diet, conservation, summary,
   bodyMarkdown, bodyStructureMarkdown, habitsMarkdown, funFactsMarkdown, reportSearchQuery
   - taxon：必须写出至少 纲、目、科、属、种 五级（能写界、门则一并写出），中文类群名 + 括号内拉丁对照，用分号分隔，如「纲：鸟纲（Aves）；目：鸵形目（Struthioniformes）；科：鸵鸟科（Struthionidae）；属：鸵鸟属（Struthio）；种：鸵鸟（Struthio camelus）」；禁止只写「种」一级或仅拉丁名
   - habitat / diet：具体则具体；信息少时说明「记载较少」并写已知要点
   - summary：若干句中文，概括分类、生境或分布感、识别或生态上的特点（若有）、保护或人类影响（若不确定请说明）
   - bodyMarkdown：中文正文，建议含「物种特点与识别要点」小节（标题可自拟，不必固定八字）；可含分布、食性、繁殖、观察与保护等，能写几节写几节
   - bodyStructureMarkdown：体型、器官或系统与生态相关的形态适应；信息少时写已知部分并说明缺环
   - habitsMarkdown：节律、社群、繁殖等；缺失信息处简短说明
   - funFactsMarkdown：有趣且较可靠的点；没有把握时写「冷知识类记载较少」并给可查方向，不编故事
   - reportSearchQuery：学术检索用短语，含学名或英文名 + 主题词即可，不要编造论文题名
3. quiz：尽量给出恰好 3 道四选题（question、options 长度 4、correctIndex 0–3）；若实在难以命题，可省略 quiz 键或传空数组 []。
4. 不要输出兽医诊断或野外急救建议。
5. JSON 字符串内用真实换行分隔段落与标题行，不要输出字面量「反斜杠+n」当作换行。`;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!allowRate(ip)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试（每分钟最多 10 次）。连续测试时请间隔 1 分钟。" },
        { status: 429 },
      );
    }

    let body: {
      query?: string;
      /** disambiguate：仅返回统称选项，不生成图鉴 */
      mode?: "disambiguate" | "generate";
      /** 用户已在弹窗中选择具体种或统称概览，跳过歧义提示 */
      skipDisambiguation?: boolean;
      /** 生成类群笼统介绍（name 仍为用户输入的统称） */
      genericOverview?: boolean;
      /** 消歧后生成具体种时：具体种搜图为空则回退用此统称的英译搜图 */
      imageFallbackQuery?: string;
      /** 用户确认仍使用原输入（跳过名称纠正建议） */
      forceQuery?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "无效的 JSON 请求体。" }, { status: 400 });
    }

    const query = normalizeExploreSpeciesQuery(body.query ?? "");
    const mode = body.mode === "disambiguate" ? "disambiguate" : "generate";
    const skipDisambiguation = body.skipDisambiguation === true;
    const genericOverview = body.genericOverview === true;
    const imageFallbackQuery = normalizeExploreSpeciesQuery(body.imageFallbackQuery ?? "");
    const forceQuery = body.forceQuery === true;
    if (!query || query.length > 80) {
      return NextResponse.json({ error: "请输入 1–80 字以内的动物名称。" }, { status: 400 });
    }

    if (mode === "disambiguate") {
      const nameAliasEarly = resolveSpeciesNameAlias(query);
      let wikiEarly: Awaited<ReturnType<typeof resolveSpeciesWikiAnchor>> | null = null;
      try {
        wikiEarly = await resolveSpeciesWikiAnchor(query);
      } catch {
        wikiEarly = null;
      }
      if (!forceQuery) {
        const nameSuggestion = await resolveSpeciesNameSuggestion(query, wikiEarly, nameAliasEarly);
        if (nameSuggestion) {
          return NextResponse.json({
            status: "suggest_name" as const,
            originalQuery: query,
            suggestion: nameSuggestion,
          });
        }
      }

      const apiKey = resolveApiKey();
      const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
      const client = apiKey
        ? new OpenAI({ apiKey, baseURL: resolveBaseUrl() || undefined })
        : undefined;
      const disambig = await resolveSpeciesDisambiguation(query, client, chatModel);
      if (disambig) {
        return NextResponse.json({
          status: "choose_species" as const,
          disambiguation: disambig,
          originalQuery: query,
        });
      }
      return NextResponse.json({ status: "specific" as const, query });
    }

    const nameAlias = resolveSpeciesNameAlias(query);

    let wikiForValidate: Awaited<ReturnType<typeof resolveSpeciesWikiAnchor>> | null = null;
    try {
      wikiForValidate = await resolveSpeciesWikiAnchor(query);
    } catch {
      wikiForValidate = null;
    }

    const inputCheck = validateExploreSpeciesQuery(query, {
      alias: nameAlias,
      wikiAnchor: wikiForValidate,
    });
    if (!inputCheck.ok) {
      return NextResponse.json({ error: inputCheck.error }, { status: 400 });
    }

    if (!forceQuery) {
      const nameSuggestion = await resolveSpeciesNameSuggestion(
        query,
        wikiForValidate,
        nameAlias,
      );
      if (nameSuggestion) {
        return NextResponse.json({
          status: "suggest_name" as const,
          originalQuery: query,
          suggestion: nameSuggestion,
        });
      }
    }

    const apiKey = resolveApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置语言模型密钥（OPENAI_API_KEY 或 OLLAMA_API_KEY）。" },
        { status: 503 },
      );
    }

    const baseURL = resolveBaseUrl();
    const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

    let client: OpenAI;
    try {
      client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "无法初始化模型客户端";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    if (!skipDisambiguation) {
      const disambig = await resolveSpeciesDisambiguation(query, client, chatModel);
      if (disambig) {
        return NextResponse.json({
          status: "choose_species" as const,
          disambiguation: disambig,
          originalQuery: query,
        });
      }
    }

    const anchor = wikiForValidate;
    const imageSciHint =
      anchor?.resolvedTaxon?.scientificName ??
      anchor?.scientificNameHint ??
      nameAlias?.scientificNameHint ??
      null;
    const imageEnHint = anchor?.englishCommonName ?? null;

    const anchorForPrompt =
      anchor ?? {
        userQuery: query,
        zhTitle: null,
        zhExtract: null,
        scientificNameHint: nameAlias?.scientificNameHint ?? null,
        matchQuality: "none" as const,
        modernZhName: nameAlias?.modernZh ?? null,
        identityNote: nameAlias?.note ?? null,
        resolvedTaxon: null,
        enWikiExtract: null,
        contentSource: "none" as const,
        englishCommonName: null,
        taxonBrief: null,
        referenceBody: null,
      };

    const userPrompt = buildExploreSpeciesUserPrompt(
      query,
      anchorForPrompt,
      { genericGroupOverview: genericOverview },
    );

    const richBaiduRef =
      anchorForPrompt.contentSource === "baidu" &&
      Boolean(anchorForPrompt.referenceBody) &&
      baiduReferenceIsRich(anchorForPrompt.referenceBody!);

    async function runCompletion(temp: number, extraUserHint?: string): Promise<string | null> {
      const completion = await client.chat.completions.create({
        model: chatModel,
        temperature: temp,
        max_tokens: 8192,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: extraUserHint ? `${userPrompt}\n\n${extraUserHint}` : userPrompt,
          },
        ],
      });
      return completion.choices[0]?.message?.content?.trim() ?? null;
    }

    const parseOpts = richBaiduRef
      ? ({ detailLevel: "baidu_enriched" } as const)
      : undefined;

    const parseRetryHint = richBaiduRef
      ? `【重要】百度百科资料较充分，上次 JSON 未达详图鉴标准（正文过短、小节不足、或 taxon 层级不够）。
请重新输出完整 JSON，按【百度百科正文参考】充分展开：
- bodyMarkdown 至少 3 个 ## 小节，总篇幅建议 600 字以上
- bodyStructureMarkdown / habitsMarkdown 各至少 2 个小标题
- funFactsMarkdown 写 2–4 条冷知识
- taxon 须含纲/目/科/属/种五级；habitat / diet / conservation 写具体
- name 须与用户输入「${query}」完全一致`
      : `【重要】上次 JSON 未通过系统校验（字段过短、taxon 缺少纲/目/科/属/种层级、或正文过短）。
请重新输出一个完整 JSON：
- taxon 须至少含纲、目、科、属、种五级，格式如「纲：鸟纲（Aves）；目：鹤鸵目（Casuariiformes）；科：…」
- 各 Markdown 字段写实质内容；该物种虽冷门也须据可靠生物学知识撰写，禁止整篇以「记载较少」敷衍
- name 须与用户输入「${query}」完全一致`;

    /* 搜图英译放在长图鉴生成之前，避免 40s+ 长请求后二次 LLM 常返回空（noRaw） */
    let searchQueryEn: string | null = null;
    let fallbackSearchQueryEn: string | null = null;
    const useImageFallback =
      imageFallbackQuery.length > 0 && imageFallbackQuery !== query;

    if (/[\u4e00-\u9fff]/.test(query)) {
      searchQueryEn = await translateSpeciesNameForImageSearch(client, chatModel, {
        nameZh: query,
        scientificNameHint: imageSciHint,
        englishCommonNameHint: imageEnHint,
      });
    } else if (isValidImageSearchEn(query) && !isLikelyScientificName(query)) {
      searchQueryEn = query.trim();
    }

    const preliminarySearchQueryEn = searchQueryEn;
    let galleryPrefetch: ReturnType<typeof resolveSpeciesGalleryWithFallback> | null = null;
    if (isValidImageSearchCommonName(preliminarySearchQueryEn)) {
      const prefetchCtx = buildSpeciesImageSearchContext({
        userQuery: query,
        scientificName: imageSciHint,
        searchQueryEn: preliminarySearchQueryEn!,
      });
      galleryPrefetch = resolveSpeciesGalleryWithFallback(
        {
          userQuery: query,
          scientificName: imageSciHint,
          imageSearchContext: prefetchCtx,
        },
        null,
      );
    }

    if (useImageFallback && /[\u4e00-\u9fff]/.test(imageFallbackQuery)) {
      fallbackSearchQueryEn = await translateSpeciesNameForImageSearch(client, chatModel, {
        nameZh: imageFallbackQuery,
      });
    } else if (
      useImageFallback &&
      isValidImageSearchEn(imageFallbackQuery) &&
      !isLikelyScientificName(imageFallbackQuery)
    ) {
      fallbackSearchQueryEn = imageFallbackQuery.trim();
    }

    let rawText: string | null = null;
    try {
      rawText = await runCompletion(
        richBaiduRef ? 0.22 : anchor?.zhTitle || nameAlias ? 0.28 : 0.32,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "模型请求失败";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    if (!rawText) {
      return NextResponse.json({ error: "模型未返回内容。" }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(rawText);
    } catch (parseErr) {
      const hint =
        parseErr instanceof Error ? parseErr.message : "JSON 解析失败";
      return NextResponse.json(
        {
          error: `无法解析模型返回的 JSON：${hint}。可尝试缩短问题或更换模型。`,
        },
        { status: 502 },
      );
    }

    let payload = parseExploreSpeciesJson(parsed, parseOpts);
    let lastParsed: unknown = parsed;
    if (!payload) {
      for (const temp of [0.2, 0.15] as const) {
        try {
          const retryText = await runCompletion(temp, parseRetryHint);
          if (!retryText) continue;
          const retryParsed = extractJsonObject(retryText);
          lastParsed = retryParsed;
          payload = parseExploreSpeciesJson(retryParsed, parseOpts);
          if (payload) break;
        } catch {
          /* 尝试下一次重试 */
        }
      }
    }
    /* 百科详图鉴标准未过审时，降级为默认篇幅，避免云服务器 LLM 略短时直接 502 */
    if (!payload && richBaiduRef) {
      payload =
        parseExploreSpeciesJson(lastParsed, { detailLevel: "default" }) ??
        parseExploreSpeciesJson(parsed, { detailLevel: "default" });
    }
    if (!payload) {
      return NextResponse.json(
        {
          error:
            "模型返回未通过最低内容校验：某字段过短或正文过短且缺少小节结构。可重试一次；若仍失败可换模型。需要原先「详图鉴」硬性篇幅时，在服务端环境变量设置 EXPLORE_SPECIES_STRICT_DETAIL=1。",
        },
        { status: 502 },
      );
    }

    const anchorMismatch =
      detectPlaceholderUnknownPayload(payload, anchorForPrompt) ??
      detectAnchorContentMismatch(payload, anchorForPrompt);
    if (anchorMismatch) {
      try {
        const retryText = await runCompletion(0.12, anchorMismatch.retryHint);
        if (retryText) {
          const retryParsed = extractJsonObject(retryText);
          const retryPayload = parseExploreSpeciesJson(retryParsed, parseOpts);
          if (
            retryPayload &&
            !detectPlaceholderUnknownPayload(retryPayload, anchorForPrompt) &&
            !detectAnchorContentMismatch(retryPayload, anchorForPrompt)
          ) {
            payload = retryPayload;
          }
        }
      } catch {
        /* 保留首次结果 */
      }
    }

    const beforeName = payload.name.trim();
    payload = enforceUserQuerySpeciesName(payload, query, anchor);

    const nameWasWrong =
      beforeName !== query.trim() &&
      beforeName.length > 0 &&
      !beforeName.includes(query) &&
      !query.includes(beforeName);

    if (nameWasWrong && (anchor?.zhTitle || nameAlias)) {
      try {
        const retryText = await runCompletion(0.15);
        if (retryText) {
          const retryParsed = extractJsonObject(retryText);
          const retryPayload = parseExploreSpeciesJson(retryParsed, parseOpts);
          if (retryPayload) {
            const retryBefore = retryPayload.name.trim();
            payload = enforceUserQuerySpeciesName(retryPayload, query, anchor);
            if (retryBefore !== query.trim() && retryBefore === beforeName) {
              /* 重试仍错，保留 enforce 后的用户名字 + 说明 */
            }
          }
        }
      } catch {
        /* 保留首次结果 */
      }
    }

    searchQueryEn = await resolveImageSearchEnglish(client, chatModel, {
      nameZh: query,
      scientificName: payload.scientificName,
      reportSearchQuery: payload.reportSearchQuery,
      preliminaryEn: searchQueryEn,
      scientificNameHint: imageSciHint,
      englishCommonNameHint: imageEnHint,
    });

    if (!isValidImageSearchCommonName(fallbackSearchQueryEn) && useImageFallback) {
      fallbackSearchQueryEn = await resolveImageSearchEnglish(client, chatModel, {
        nameZh: imageFallbackQuery,
        preliminaryEn: fallbackSearchQueryEn,
      });
    }

    let imageUrls: string[] = [];
    let imageProvider: "unsplash" | null = null;
    try {
      const finalEn = searchQueryEn?.trim().toLowerCase() ?? "";
      const prefetchEn = preliminarySearchQueryEn?.trim().toLowerCase() ?? "";
      const canReusePrefetch =
        galleryPrefetch &&
        finalEn.length > 0 &&
        prefetchEn.length > 0 &&
        finalEn === prefetchEn;

      if (canReusePrefetch) {
        const gallery = await galleryPrefetch;
        imageUrls = gallery.urls;
        imageProvider = gallery.provider;
      } else {
        const primaryCtx = isValidImageSearchCommonName(searchQueryEn)
          ? buildSpeciesImageSearchContext({
              userQuery: query,
              scientificName: payload.scientificName,
              searchQueryEn,
            })
          : null;
        const fallbackCtx =
          useImageFallback && isValidImageSearchCommonName(fallbackSearchQueryEn)
            ? buildSpeciesImageSearchContext({
                userQuery: imageFallbackQuery,
                scientificName: payload.scientificName,
                searchQueryEn: fallbackSearchQueryEn,
              })
            : null;

        const gallery =
          primaryCtx || fallbackCtx
            ? await resolveSpeciesGalleryWithFallback(
                {
                  userQuery: query,
                  scientificName: payload.scientificName,
                  imageSearchContext: primaryCtx ?? fallbackCtx!,
                },
                fallbackCtx &&
                  primaryCtx &&
                  fallbackCtx.searchQueryEn.trim().toLowerCase() !==
                    primaryCtx.searchQueryEn.trim().toLowerCase()
                  ? fallbackCtx
                  : null,
              )
            : { urls: [], provider: null };
        imageUrls = gallery.urls;
        imageProvider = gallery.provider;
      }
    } catch {
      imageUrls = [];
      imageProvider = null;
    }

    const imageUrl = imageUrls[0] ?? null;

    return NextResponse.json({
      status: "species" as const,
      species: {
        ...payload,
        imageUrl,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        imageProvider,
      },
    });
  } catch (e) {
    console.error("[explore-species]", e);
    const msg = e instanceof Error ? e.message : "服务器内部错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
