import type { Metadata } from "next";
import { Suspense } from "react";
import { NatureAuthForm } from "@/components/auth/NatureAuthForm";

export const metadata: Metadata = {
  title: "登录",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-stone-500">加载中…</p>}>
      <NatureAuthForm mode="login" />
    </Suspense>
  );
}
