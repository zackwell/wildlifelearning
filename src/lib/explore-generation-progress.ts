/** 图鉴生成时的模糊进度文案（不暴露数据来源与翻译细节） */

export type FieldGuideProgressPhase = "disambiguate" | "generate";

export type FieldGuideProgressStage = {
  label: string;
  hint: string;
};

export const DISAMBIGUATE_PROGRESS: FieldGuideProgressStage = {
  label: "正在理解您输入的名称",
  hint: "判断是否为某一具体物种",
};

export const FIELD_GUIDE_GENERATION_STAGES: FieldGuideProgressStage[] = [
  {
    label: "正在核对物种信息",
    hint: "确认名称所指的动物种类",
  },
  {
    label: "整理分类与识别要点",
    hint: "归纳外形与分类线索",
  },
  {
    label: "撰写生态与习性描述",
    hint: "组织分布、食性与行为等内容",
  },
  {
    label: "匹配参考配图",
    hint: "为图鉴挑选合适的示意照片",
  },
  {
    label: "润色图鉴正文",
    hint: "统一结构与表述",
  },
  {
    label: "即将完成",
    hint: "最后检查内容完整性",
  },
];

/** 每阶段停留毫秒（生成较慢，略长一些） */
export const GENERATION_STAGE_MS = 5200;

export function stageProgressPercent(stageIndex: number, stageCount: number): number {
  if (stageCount <= 1) return 12;
  const base = ((stageIndex + 1) / stageCount) * 88;
  return Math.min(92, Math.max(8, base));
}
