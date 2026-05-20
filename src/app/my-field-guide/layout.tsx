import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "我的图鉴",
  description: "保存在本机的个人动物图鉴草稿与学习自测入口。",
};

export default function MyFieldGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
