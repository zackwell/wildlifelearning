"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSplash = pathname === "/";
  const isAuth = pathname.startsWith("/auth/");
  const isAdmin = pathname.startsWith("/admin");
  const fullBleed = isSplash || isAuth || isAdmin;
  const showHeader = !isSplash && !isAuth && !isAdmin;

  return (
    <>
      {showHeader ? <SiteHeader /> : null}
      <main
        className={
          isAdmin
            ? "flex-1 w-full"
            : fullBleed
              ? "flex-1 w-full"
              : "mx-auto w-full max-w-5xl flex-1 px-4 py-8"
        }
      >
        {children}
      </main>
    </>
  );
}
