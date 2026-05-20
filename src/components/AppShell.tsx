"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSplash = pathname === "/";
  const isAuth = pathname.startsWith("/auth/");
  const fullBleed = isSplash || isAuth;
  const showHeader = !isSplash && !isAuth;

  return (
    <>
      {showHeader ? <SiteHeader /> : null}
      <main className={fullBleed ? "flex-1 w-full" : "mx-auto w-full max-w-5xl flex-1 px-4 py-8"}>
        {children}
      </main>
    </>
  );
}
