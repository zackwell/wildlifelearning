import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "智能助手",
  description: "基于站内资料的科普问答；图鉴未覆盖的知识点可在此提问。",
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
