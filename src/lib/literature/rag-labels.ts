import { loadUserPreferences, saveUserPreferences } from "@/lib/user-preferences";

export const LITERATURE_RAG_SKIP_CONFIRM_KEY = "wl-literature-rag-skip-confirm";

export function literatureRagLabels(opts: {
  predominantlyChinese: boolean;
  zhRagReady: boolean;
}) {
  if (opts.predominantlyChinese) {
    return {
      action: opts.zhRagReady ? "重新排版" : "智能排版",
      processing: "排版中…",
      readyHint: "已启用检索优化版 · 助手优先引用",
      viewOriginal: "原文",
      viewOptimized: "优化版",
    };
  }
  return {
    action: opts.zhRagReady ? "重新生成" : "生成检索版",
    processing: "翻译中…",
    readyHint: "已启用中文检索版 · 助手优先引用",
    viewOriginal: "原文",
    viewOptimized: "检索版",
  };
}

export function literatureRagModalCopy(opts: {
  predominantlyChinese: boolean;
  zhRagReady: boolean;
}): { title: string; body: string } {
  if (opts.zhRagReady) {
    return opts.predominantlyChinese
      ? {
          title: "重新智能排版？",
          body: "将覆盖现有检索优化版并重新建立索引。任务在后台执行，您可继续浏览其他页面。",
        }
      : {
          title: "重新生成检索版？",
          body: "将覆盖现有中文检索版并重新翻译、分块与索引。任务在后台执行，您可继续浏览其他页面。",
        };
  }
  return opts.predominantlyChinese
    ? {
        title: "开始智能排版？",
        body: "将对中文文献做段落整理与结构优化，生成检索优化版（原文保留不变）。任务在后台执行，完成后可用于智能助手引用。",
      }
    : {
        title: "开始生成检索版？",
        body: "将把外文文献译为中文并优化排版，生成检索版（原文保留不变）。长文献可能在后台处理数分钟，您可继续其他操作。",
      };
}

export function shouldSkipLiteratureRagConfirm(): boolean {
  return loadUserPreferences().skipLiteratureRagConfirm;
}

export function setSkipLiteratureRagConfirm(skip: boolean): void {
  saveUserPreferences({ skipLiteratureRagConfirm: skip });
}
