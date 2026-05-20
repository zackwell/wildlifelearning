"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export function AuthHeaderActions() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        const data = (await res.json()) as { user: SessionUser | null };
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      setUser(null);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return <span className="text-xs text-stone-500 dark:text-stone-400">…</span>;
  }

  if (user) {
    const label = user.displayName || user.email.split("@")[0];
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/account"
          className="max-w-[8rem] truncate text-xs font-medium text-stone-600 underline-offset-2 hover:text-np-terracotta hover:underline dark:text-stone-300 dark:hover:text-np-cream"
          title={`${user.email} · 账号设置`}
        >
          {label}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="rounded-full border border-stone-800/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-800 transition hover:bg-white disabled:opacity-60 dark:border-stone-100/20 dark:bg-stone-800/50 dark:text-stone-100"
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/auth/login"
        className="rounded-full bg-np-cta px-3 py-1.5 text-xs font-semibold text-np-cta-ink shadow-sm transition hover:bg-np-cta-hover"
      >
        登录
      </Link>
      <Link
        href="/auth/register"
        className="rounded-full border border-stone-800/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-800 transition hover:bg-white dark:border-stone-100/20 dark:bg-stone-800/50 dark:text-stone-100 dark:hover:bg-stone-800"
      >
        注册
      </Link>
    </>
  );
}
