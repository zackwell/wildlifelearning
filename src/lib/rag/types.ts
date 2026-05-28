export type RagSourceType = "topic" | "literature" | "admin";

export type RagChunk = {
  id: string;
  text: string;
  speciesId: string | null;
  sourceType: RagSourceType;
  sourceTitle: string;
  sourcePath: string;
  embedding?: number[];
};

export type RagStore = {
  version: 1;
  chunks: RagChunk[];
};

export type Citation = {
  id: string;
  excerpt: string;
  sourceTitle: string;
  sourcePath: string;
  /** 中文检索译文摘录时的说明 */
  translationNote?: string;
};

export type LiteratureTranslation = {
  status: "processing" | "ready" | "failed";
  translatedAt: string;
  zhBody: string;
  zhChunks: RagChunk[];
  error?: string;
  /** translate=外文译中文；format=中文智能排版 */
  mode?: "translate" | "format";
};

export type LiteratureDocument = {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  body: string;
  chunks: RagChunk[];
  /** 智能翻译/排版后的检索版（原文 body 不变） */
  translation?: LiteratureTranslation;
};

export type LiteratureMeta = {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  enabledForAsk: boolean;
  zhRagReady?: boolean;
  translationFailed?: boolean;
  translationProcessing?: boolean;
  predominantlyChinese?: boolean;
};
