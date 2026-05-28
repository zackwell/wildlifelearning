"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountContentStats } from "@/components/auth/AccountContentStats";
import { AccountPreferencesPanel } from "@/components/auth/AccountPreferencesPanel";
import { DeleteAccountModal } from "@/components/auth/DeleteAccountModal";
import type { UserContentStats } from "@/lib/user-data/stats-server";

type Props = {
  initialUser: {
    email: string;
    displayName: string | null;
  };
  contentStats: UserContentStats;
};

const cardClass =
  "rounded-2xl border border-stone-900/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-stone-900/50";
const fieldClass =
  "mt-1.5 w-full rounded-xl border border-stone-300/80 bg-white/90 px-4 py-2.5 text-stone-900 outline-none ring-np-cta/30 focus:border-np-cta focus:ring-2 dark:border-stone-600 dark:bg-stone-950/50 dark:text-stone-50";

export function AccountSettingsClient({ initialUser, contentStats }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialUser.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function onDeleteAccount(currentPassword: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? "注销失败，请稍后重试。");
        return;
      }
      setDeleteOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("网络错误，请稍后重试。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">账号设置</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          管理登录信息、界面与学习偏好。图鉴、题库、文献已支持云端同步；偏好设置保存在本浏览器。
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

      <AccountPreferencesPanel />

      <AccountContentStats stats={contentStats} />

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">数据与隐私</h2>
        <ul className="mt-4 space-y-2 text-sm text-stone-600 dark:text-stone-400">
          <li>
            图鉴、题库、文献正文与检索索引在登录后会同步至服务器；界面偏好仅保存在当前浏览器。
          </li>
          <li>
            详见{" "}
            <Link href="/privacy" className="font-medium text-stone-800 underline-offset-2 hover:underline dark:text-stone-200">
              隐私说明
            </Link>{" "}
            与{" "}
            <Link href="/disclaimer" className="font-medium text-stone-800 underline-offset-2 hover:underline dark:text-stone-200">
              免责声明
            </Link>
            。
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/guide#settings"
            className="rounded-full border border-stone-800/15 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100 dark:border-stone-100/20 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            查看使用说明
          </Link>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">登录</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          退出登录后云端数据仍保留；注销账户将永久删除账号及全部云端内容。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut || deleting}
            className="rounded-full border border-stone-800/15 px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:opacity-60 dark:border-stone-100/20 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            {loggingOut ? "退出中…" : "退出登录"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
            disabled={loggingOut || deleting}
            className="rounded-full border border-red-300/70 px-5 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:text-red-200 dark:hover:bg-red-950/40"
          >
            注销账户
          </button>
        </div>
      </section>

      <DeleteAccountModal
        open={deleteOpen}
        email={initialUser.email}
        busy={deleting}
        error={deleteError}
        onCancel={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={(currentPassword) => void onDeleteAccount(currentPassword)}
      />
    </div>
  );
}
