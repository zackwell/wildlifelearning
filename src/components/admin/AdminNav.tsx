"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "概览" },
  { href: "/admin/users", label: "用户" },
  { href: "/admin/field-guides", label: "图鉴" },
  { href: "/admin/literature", label: "文献" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-stone-800 bg-stone-950 px-4 py-6">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-stone-500">Nature+</p>
        <h1 className="text-lg font-semibold text-stone-100">管理后台</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white"
                  : "rounded-lg px-3 py-2 text-sm text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/main"
        className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-center text-sm text-stone-200 transition hover:bg-stone-800"
      >
        返回用户界面
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 transition hover:bg-stone-900"
      >
        退出登录
      </button>
    </aside>
  );
}
