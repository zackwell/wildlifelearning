import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "图鉴主页",
  description: "探索动物并建立个人图鉴。",
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
