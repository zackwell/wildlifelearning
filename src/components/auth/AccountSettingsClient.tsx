"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  initialUser: {
    email: string;
    displayName: string | null;
  };
};

const cardClass =
  "rounded-2xl border border-stone-900/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-stone-900/50";
const fieldClass =
  "mt-1.5 w-full rounded-xl border border-stone-300/80 bg-white/90 px-4 py-2.5 text-stone-900 outline-none ring-np-cta/30 focus:border-np-cta focus:ring-2 dark:border-stone-600 dark:bg-stone-950/50 dark:text-stone-50";

const shortcuts = [
  { href: "/my-field-guide", label: "我的图鉴", desc: "已保存的物种图鉴（登录后同步云端）" },
  { href: "/my-question-bank", label: "我的题库", desc: "学习检测与练习题（登录后同步云端）" },
  { href: "/topics", label: "知识专题", desc: "上传文献、阅读与智能助手（需登录上传）" },
];

export function AccountSettingsClient({ initialUser }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialUser.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, string> = { displayName: displayName.trim() };
      if (newPassword) {
        body.newPassword = newPassword;
        body.currentPassword = currentPassword;
      }
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; user?: { displayName: string | null } };
      if (!res.ok) {
        setError(data.error ?? "保存失败");
        return;
      }
      setMessage("已保存。");
      setCurrentPassword("");
      setNewPassword("");
      if (data.user?.displayName !== undefined) {
        setDisplayName(data.user.displayName ?? "");
      }
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">账号设置</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          管理登录信息与快捷入口。图鉴、题库、文献已支持云端同步。
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">基本信息</h2>
        <form onSubmit={onSaveProfile} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">邮箱</span>
            <input type="email" value={initialUser.email} readOnly className={`${fieldClass} opacity-70`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">昵称</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={fieldClass}
              placeholder="顶栏显示的名称"
              maxLength={40}
            />
          </label>
          <div className="border-t border-stone-200/80 pt-4 dark:border-stone-700">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">修改密码（可选）</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs text-stone-600 dark:text-stone-400">当前密码</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="current-password"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-stone-600 dark:text-stone-400">新密码（至少 8 位）</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="new-password"
                />
              </label>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-np-cta px-5 py-2.5 text-sm font-semibold text-np-cta-ink hover:bg-np-cta-hover disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存更改"}
          </button>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">我的内容</h2>
        <ul className="mt-4 space-y-3">
          {shortcuts.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-xl border border-stone-200/80 px-4 py-3 transition hover:border-np-cta/40 hover:bg-np-peach/30 dark:border-stone-700 dark:hover:bg-stone-800/50"
              >
                <span className="font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
                <span className="mt-1 block text-xs text-stone-600 dark:text-stone-400">{item.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">登录</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          微信绑定将在后续版本开放。
        </p>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-4 rounded-full border border-stone-800/15 px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:opacity-60 dark:border-stone-100/20 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          {loggingOut ? "退出中…" : "退出登录"}
        </button>
      </section>
    </div>
  );
}
