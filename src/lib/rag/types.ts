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
};

export type LiteratureDocument = {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  body: string;
  chunks: RagChunk[];
};

export type LiteratureMeta = {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  enabledForAsk: boolean;
};
