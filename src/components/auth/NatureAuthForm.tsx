"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { clearGuestModePreferred, enterGuestMode } from "@/lib/guest-mode";

type Mode = "login" | "register";

const fieldClass =
  "mt-1.5 w-full rounded-2xl border border-stone-300/80 bg-white/90 px-4 py-3 text-stone-900 shadow-inner outline-none ring-np-cta/30 placeholder:text-stone-400 focus:border-np-cta focus:ring-2 dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-50";

export function NatureAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, displayName: displayName.trim() || undefined };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "请求失败");
        return;
      }
      clearGuestModePreferred();
      router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/main");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function guestContinue() {
    await enterGuestMode();
    router.push("/main");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md pb-8">
      <div className="flex justify-center gap-2 rounded-full bg-black/5 p-1 dark:bg-white/10">
        <Link
          href="/auth/login"
          className={
            mode === "login"
              ? "min-w-[6rem] rounded-full bg-white px-5 py-2 text-center text-sm font-semibold text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-50"
              : "min-w-[6rem] rounded-full px-5 py-2 text-center text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
          }
        >
          登录
        </Link>
        <Link
          href="/auth/register"
          className={
            mode === "register"
              ? "min-w-[6rem] rounded-full bg-white px-5 py-2 text-center text-sm font-semibold text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-50"
              : "min-w-[6rem] rounded-full px-5 py-2 text-center text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
          }
        >
          注册
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        {mode === "register" ? (
          <label className="block">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
              昵称（选填）
            </span>
            <input
              type="text"
              name="displayName"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={fieldClass}
              placeholder="在图鉴中显示的名称"
            />
          </label>
        ) : null}
        <label className="block">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">邮箱</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">密码</span>
          <input
            type="password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
            placeholder="至少 8 位"
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-red-800/20 bg-red-50/90 px-4 py-3 text-sm text-red-950 dark:border-red-200/20 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-np-cta py-3.5 text-sm font-semibold text-np-cta-ink shadow-md transition hover:bg-np-cta-hover disabled:opacity-60"
        >
          {loading ? "请稍候…" : mode === "login" ? "登录" : "注册"}
        </button>

        {mode === "login" ? (
          <button
            type="button"
            onClick={() => void guestContinue()}
            className="w-full rounded-full border-2 border-stone-800/15 bg-white/60 py-3 text-sm font-semibold text-stone-800 transition hover:bg-white dark:border-stone-100/20 dark:bg-stone-800/40 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            以游客身份继续
          </button>
        ) : null}
      </form>

      <p className="mt-10 text-center text-xs leading-relaxed text-stone-600 dark:text-stone-400">
        Nature+野生动物智能图鉴 · 科普教育用途
        <br />
        联系方式：{" "}
        <a href="mailto:thirstycacti.zyy@gmail.com" className="text-np-terracotta underline-offset-2 hover:underline">
          thirstycacti.zyy@gmail.com
        </a>
      </p>
    </div>
  );
}
