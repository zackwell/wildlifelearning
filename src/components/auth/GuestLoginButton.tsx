"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { enterGuestMode } from "@/lib/guest-mode";

export function GuestLoginButton({ className }: { className?: string }) {
  const router = useRouter();

  async function onGuestLogin() {
    await enterGuestMode();
    router.push("/main");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void onGuestLogin()}
      className={className}
    >
      游客登录
    </button>
  );
}

/** 欢迎页右上角「加入」仍走注册；游客按钮单独处理 */
export function WelcomeAuthButtons() {
  return (
    <div className="pointer-events-auto flex flex-wrap justify-end gap-3">
      <GuestLoginButton className="rounded-full bg-np-cta px-5 py-2.5 text-sm font-semibold text-np-cta-ink shadow-lg shadow-black/20 ring-1 ring-black/5 transition hover:bg-np-cta-hover" />
      <Link
        href="/auth/login"
        className="rounded-full bg-np-cta px-5 py-2.5 text-sm font-semibold text-np-cta-ink shadow-lg shadow-black/20 ring-1 ring-black/5 transition hover:bg-np-cta-hover"
      >
        加入
      </Link>
    </div>
  );
}
