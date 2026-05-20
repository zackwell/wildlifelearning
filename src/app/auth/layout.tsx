import Image from "next/image";
import Link from "next/link";
import { authLeftHero } from "@/lib/nature-images";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-np-peach text-stone-900 sm:flex-row dark:bg-stone-900 dark:text-stone-100">
      <div className="relative min-h-[36vh] w-full sm:min-h-[100dvh] sm:w-[46%] lg:w-[48%]">
        <Image
          src={authLeftHero}
          alt="登录区配图"
          fill
          priority
          className="object-cover object-[center_40%]"
          sizes="(max-width: 640px) 100vw, 48vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20 sm:bg-gradient-to-r sm:from-black/30 sm:via-transparent sm:to-transparent" />
        <Link
          href="/"
          className="absolute left-4 top-4 rounded-full bg-black/40 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/55 sm:text-sm"
        >
          返回欢迎页
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-np-peach px-6 py-10 sm:min-h-[100dvh] sm:px-10 dark:bg-stone-900">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <p className="font-sans text-4xl font-bold tracking-tight text-np-terracotta dark:text-np-cream sm:text-5xl lg:text-6xl">
              Nature+
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-np-cream dark:text-stone-50 sm:text-5xl lg:text-6xl">
              智能图鉴
            </h1>
            <p className="mt-3 text-base text-stone-600 dark:text-stone-400 sm:text-lg">登录或注册你的账号</p>
          </div>
          <div className="text-left">{children}</div>
        </div>
      </div>
    </div>
  );
}
