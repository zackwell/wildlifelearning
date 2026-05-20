import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SiteFooter } from "@/components/SiteFooter";
import { UserDataMigrator } from "@/components/auth/UserDataMigrator";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nature+智能图鉴",
    template: "%s | Nature+智能图鉴",
  },
  description:
    "Nature+ 智能图鉴：探索感兴趣的动物，建立个人图鉴；含习性、身体结构与趣闻草稿，并可跳转学术检索与初版学习自测。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans flex min-h-screen flex-col antialiased">
        <UserDataMigrator />
        <AppShell>{children}</AppShell>
        <SiteFooter />
      </body>
    </html>
  );
}
