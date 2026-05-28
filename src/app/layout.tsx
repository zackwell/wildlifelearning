import type { Metadata } from "next";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { AdminSecretShortcut } from "@/components/admin/AdminSecretShortcut";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeProvider } from "@/components/auth/ThemeProvider";
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans flex min-h-screen flex-col antialiased">
        <Script id="wl-theme-init" strategy="beforeInteractive">
          {`(function(){try{var k="wl-user-preferences-v1";var p=JSON.parse(localStorage.getItem(k)||"{}");var s=p.colorScheme||"system";var r=document.documentElement;r.classList.remove("dark");if(s==="dark")r.classList.add("dark");else if(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)r.classList.add("dark");}catch(e){}})();`}
        </Script>
        <AdminSecretShortcut />
        <UserDataMigrator />
        <ThemeProvider />
        <AppShell>{children}</AppShell>
        <SiteFooter />
      </body>
    </html>
  );
}
