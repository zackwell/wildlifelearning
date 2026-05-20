import type { Metadata } from "next";
import { Suspense } from "react";
import { NatureAuthForm } from "@/components/auth/NatureAuthForm";

export const metadata: Metadata = {
  title: "注册",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-stone-500">加载中…</p>}>
      <NatureAuthForm mode="register" />
    </Suspense>
  );
}
